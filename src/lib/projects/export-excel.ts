import * as XLSX from 'xlsx'

interface CostRow {
  employeeName: string
  periodStart: string
  periodEnd: string
  allocationPct: number | null
  allocatedCost: number
}

interface BudgetRow {
  category: string
  plannedAmount: number
  periodStart: string
  periodEnd: string
}

export function generateProjectExcel(opts: {
  projectName: string
  currency: string
  costs: CostRow[]
  budget: BudgetRow[]
}): Buffer {
  const wb = XLSX.utils.book_new()

  // Cost Distribution sheet
  const costData = [
    ['Employee', 'Period Start', 'Period End', 'Allocation %', `Cost (${opts.currency})`],
    ...opts.costs.map((r) => [
      r.employeeName,
      r.periodStart.slice(0, 10),
      r.periodEnd.slice(0, 10),
      r.allocationPct ?? '',
      r.allocatedCost,
    ]),
    [],
    ['Total', '', '', '', opts.costs.reduce((s, r) => s + r.allocatedCost, 0)],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(costData), 'Cost Distribution')

  // Budget sheet
  const budgetData = [
    ['Category', `Planned (${opts.currency})`, 'Period Start', 'Period End'],
    ...opts.budget.map((r) => [
      r.category,
      r.plannedAmount,
      r.periodStart.slice(0, 10),
      r.periodEnd.slice(0, 10),
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetData), 'Budget')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer)
}
