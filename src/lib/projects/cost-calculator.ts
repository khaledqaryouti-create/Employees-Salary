import { prisma } from '@/lib/prisma/client'
import { evaluateFormula } from '@/lib/formula-engine/evaluator'
import { logger } from '@/lib/errors/logger'

export interface EmployeeProjectCostResult {
  allocatedCost: number
  snapshotAllocationPct: number | null
  snapshotTotalEmployeeCost: number
  calculationMode: 'PERCENTAGE' | 'HOURS'
}

/**
 * Calculates how much of an employee's payroll cost should be attributed to a
 * specific project for a given period.
 *
 * Mode PERCENTAGE (allocation-based):
 *   cost = totalEmployeeCost × (allocationPct / 100) × overheadMultiplier
 *
 * Mode HOURS is reserved for Phase 2 timesheet integration.
 */
export async function calculateEmployeeProjectCost(
  employeeId: string,
  projectId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<EmployeeProjectCostResult | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { allocationMode: true, overheadFormula: true, organizationId: true },
    })
    if (!project) return null

    // Find the active assignment that overlaps this period
    const assignment = await prisma.resourceAssignment.findFirst({
      where: {
        employeeId,
        projectId,
        status: 'APPROVED',
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
      orderBy: { startDate: 'desc' },
    })
    if (!assignment) return null

    // Find the payroll item for this period (most recent approved run)
    const payrollItem = await prisma.payrollItem.findFirst({
      where: {
        employeeId,
        payrollRun: {
          organizationId: project.organizationId,
          periodYear:  periodStart.getFullYear(),
          periodMonth: periodStart.getMonth() + 1,
          status:      { in: ['APPROVED', 'PAID'] },
        },
      },
      include: { payrollRun: true },
      orderBy: { createdAt: 'desc' },
    })

    // Sum gross pay + employer cost as total employee cost
    // employerCostJson is a JSON object of cost components summed together
    const grossPay     = payrollItem ? Number(payrollItem.grossPay) : 0
    const employerCostJson = payrollItem?.employerCostJson
    const employerCost = employerCostJson && typeof employerCostJson === 'object' && !Array.isArray(employerCostJson)
      ? Object.values(employerCostJson as Record<string, number>).reduce((s, v) => s + Number(v), 0)
      : 0
    const totalCost    = grossPay + employerCost

    if (totalCost === 0) return null

    const allocationPct = Number(assignment.allocationPct ?? 0)

    // Apply overhead formula if configured (e.g. "base * 1.18")
    // We evaluate with base=1 to get the multiplier, then apply to cost.
    let overheadMultiplier = 1
    if (project.overheadFormula) {
      const evalResult = evaluateFormula(project.overheadFormula, {
        basicSalary: totalCost,
        yearsOfService: 0,
        base: 1,
      })
      if (evalResult.ok) {
        overheadMultiplier = evalResult.value
      } else {
        logger.error('cost-calculator.overhead-formula', { projectId, formula: project.overheadFormula, err: evalResult.message })
      }
    }

    const allocatedCost = (totalCost * (allocationPct / 100)) * overheadMultiplier

    return {
      allocatedCost: Math.round(allocatedCost * 100) / 100,
      snapshotAllocationPct: allocationPct,
      snapshotTotalEmployeeCost: totalCost,
      calculationMode: 'PERCENTAGE',
    }
  } catch (err) {
    logger.error('cost-calculator.calculate', { error: err, employeeId, projectId })
    return null
  }
}
