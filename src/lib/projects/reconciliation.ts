import { prisma } from '@/lib/prisma/client'

export interface ReconciliationRow {
  employeeId: string
  employeeName: string
  totalPayrollCost: number
  totalDistributed: number
  gap: number
  gapPct: number
}

/**
 * Produces a per-employee reconciliation for a given org + period.
 * Flags employees whose distributed cost does not sum to their actual payroll cost.
 */
export async function getProjectCostReconciliation(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<ReconciliationRow[]> {
  // All cost distributions for this period
  const distributions = await prisma.costDistribution.findMany({
    where: {
      organizationId,
      periodStart: { gte: periodStart },
      periodEnd:   { lte: periodEnd },
    },
    include: { employee: { select: { id: true, fullName: true } } },
  })

  if (distributions.length === 0) return []

  const employeeIds = [...new Set(distributions.map((d) => d.employeeId))]

  // Get actual payroll costs for all these employees
  const payrollItems = await prisma.payrollItem.findMany({
    where: {
      employeeId: { in: employeeIds },
      payrollRun: {
        organizationId,
        periodYear:  periodStart.getFullYear(),
        periodMonth: periodStart.getMonth() + 1,
        status: { in: ['APPROVED', 'PAID'] },
      },
    },
    select: { employeeId: true, grossPay: true, employerCostJson: true },
  })

  const costByEmployee = new Map<string, number>()
  for (const item of payrollItems) {
    const employerCostJson = item.employerCostJson
    const employerCost = employerCostJson && typeof employerCostJson === 'object' && !Array.isArray(employerCostJson)
      ? Object.values(employerCostJson as Record<string, number>).reduce((s, v) => s + Number(v), 0)
      : 0
    costByEmployee.set(item.employeeId, Number(item.grossPay) + employerCost)
  }

  const distributedByEmployee = new Map<string, number>()
  const nameByEmployee        = new Map<string, string>()
  for (const d of distributions) {
    const prev = distributedByEmployee.get(d.employeeId) ?? 0
    distributedByEmployee.set(d.employeeId, prev + Number(d.allocatedCost))
    nameByEmployee.set(d.employeeId, d.employee.fullName)
  }

  return employeeIds.map((empId) => {
    const totalPayrollCost = costByEmployee.get(empId) ?? 0
    const totalDistributed = distributedByEmployee.get(empId) ?? 0
    const gap              = totalPayrollCost - totalDistributed
    const gapPct           = totalPayrollCost > 0 ? (gap / totalPayrollCost) * 100 : 0
    return {
      employeeId:       empId,
      employeeName:     nameByEmployee.get(empId) ?? '',
      totalPayrollCost,
      totalDistributed,
      gap:              Math.round(gap * 100) / 100,
      gapPct:           Math.round(gapPct * 100) / 100,
    }
  }).filter((r) => Math.abs(r.gap) > 0.01) // only flag meaningful gaps
}
