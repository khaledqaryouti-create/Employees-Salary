import { prisma } from '@/lib/prisma/client'
import { evaluateFormula } from '@/lib/formula-engine/evaluator'
import { buildFormulaContext } from '@/lib/formula-engine/context-builder'
import { logger } from '@/lib/errors/logger'

export interface PayrollRunInput {
  payrollRunId: string
  organizationId: string
  periodYear: number
  periodMonth: number
  country?: string
}

export interface EmployeePayrollResult {
  employeeId: string
  grossPay: number
  netPay: number
  totalDeductions: number
  totalEarnings: number
  earningsJson: Record<string, number>
  deductionsJson: Record<string, number>
  employerCostJson: Record<string, number>
  hasError: boolean
  errorMessage?: string
}

/**
 * Processes payroll for a single employee.
 * Isolated in try/catch — one failure never crashes the full run.
 */
export async function processEmployeePayroll(
  employeeId: string,
  orgId: string,
  periodYear: number,
  periodMonth: number,
): Promise<EmployeePayrollResult> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        salaryStructure: {
          include: {
            components: { include: { component: true } },
          },
        },
      },
    })

    if (!employee) {
      return makeErrorResult(employeeId, 'Employee not found')
    }
    if (!employee.salaryStructure) {
      return makeErrorResult(employeeId, 'No salary structure assigned to this employee')
    }

    // Load the active rule set for this employee's country
    const ruleSet = await prisma.countryRuleSet.findFirst({
      where: {
        OR: [
          { organizationId: orgId, country: employee.country, isActive: true },
          { organizationId: null, country: employee.country, isDefault: true, isActive: true },
        ],
      },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { organizationId: 'desc' }, // org-specific rule set takes priority
    })

    if (!ruleSet) {
      return makeErrorResult(employeeId, `No active rule set found for country: ${employee.country}`)
    }

    // Load config values (rates, thresholds) for this country
    const configRows = await prisma.configValue.findMany({
      where: { organizationId: orgId, country: employee.country },
    })
    const configMap: Record<string, string> = {}
    for (const row of configRows) {
      configMap[row.key] = row.value
    }

    // Build formula context
    const context = buildFormulaContext(employee, configMap, periodYear, periodMonth)

    const earningsJson: Record<string, number> = {}
    const deductionsJson: Record<string, number> = {}
    const employerCostJson: Record<string, number> = {}

    // Evaluate each rule in order
    for (const rule of ruleSet.rules) {
      // Check employment type applicability
      if (rule.applicableTo !== 'ALL' && rule.applicableTo !== employee.employmentType) {
        continue
      }

      const result = evaluateFormula(rule.formula, context, orgId)

      if (!result.ok) {
        logger.warn('Formula evaluation failed for rule', {
          orgId,
          ruleId: rule.id,
          ruleName: rule.name,
          message: result.message,
          employeeId,
        })
        continue
      }

      const value = result.value

      // Store result and update context so subsequent rules can reference it
      const contextKey = rule.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

      context[contextKey] = value

      if (rule.type === 'EARNING') {
        earningsJson[rule.name] = value
      } else if (rule.type === 'DEDUCTION') {
        deductionsJson[rule.name] = value
      } else if (rule.type === 'EMPLOYER_COST') {
        employerCostJson[rule.name] = value
      }
    }

    const basicSalary = employee.salaryStructure.basicSalary
    const totalEarnings = Object.values(earningsJson).reduce((s, v) => s + v, 0)
    const grossPay = basicSalary + totalEarnings
    const totalDeductions = Object.values(deductionsJson).reduce((s, v) => s + v, 0)
    const netPay = grossPay - totalDeductions

    return {
      employeeId,
      grossPay: round2(grossPay),
      netPay: round2(netPay),
      totalDeductions: round2(totalDeductions),
      totalEarnings: round2(totalEarnings),
      earningsJson,
      deductionsJson,
      employerCostJson,
      hasError: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Payroll processing failed for employee', { employeeId, orgId, error: message })
    return makeErrorResult(employeeId, message)
  }
}

/**
 * Processes all employees in a payroll run and persists results.
 */
export async function runPayroll(input: PayrollRunInput): Promise<void> {
  const { payrollRunId, organizationId, periodYear, periodMonth, country } = input

  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: 'PROCESSING' },
  })

  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(country ? { country } : {}),
    },
    select: { id: true },
  })

  let totalGross = 0
  let totalNet = 0
  let totalDeductions = 0
  let successCount = 0

  for (const { id: employeeId } of employees) {
    const result = await processEmployeePayroll(
      employeeId,
      organizationId,
      periodYear,
      periodMonth,
    )

    await prisma.payrollItem.upsert({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
      create: {
        payrollRunId,
        employeeId,
        grossPay: result.grossPay,
        netPay: result.netPay,
        totalDeductions: result.totalDeductions,
        totalEarnings: result.totalEarnings,
        earningsJson: result.earningsJson,
        deductionsJson: result.deductionsJson,
        employerCostJson: result.employerCostJson,
        hasError: result.hasError,
        errorMessage: result.errorMessage,
      },
      update: {
        grossPay: result.grossPay,
        netPay: result.netPay,
        totalDeductions: result.totalDeductions,
        totalEarnings: result.totalEarnings,
        earningsJson: result.earningsJson,
        deductionsJson: result.deductionsJson,
        employerCostJson: result.employerCostJson,
        hasError: result.hasError,
        errorMessage: result.errorMessage,
      },
    })

    if (!result.hasError) {
      totalGross += result.grossPay
      totalNet += result.netPay
      totalDeductions += result.totalDeductions
      successCount++
    }
  }

  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: {
      status: 'PENDING_APPROVAL',
      processedAt: new Date(),
      totalGross: round2(totalGross),
      totalNet: round2(totalNet),
      totalDeductions: round2(totalDeductions),
      employeeCount: successCount,
    },
  })
}

function makeErrorResult(employeeId: string, errorMessage: string): EmployeePayrollResult {
  return {
    employeeId,
    grossPay: 0,
    netPay: 0,
    totalDeductions: 0,
    totalEarnings: 0,
    earningsJson: {},
    deductionsJson: {},
    employerCostJson: {},
    hasError: true,
    errorMessage,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
