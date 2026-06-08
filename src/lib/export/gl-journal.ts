/**
 * GL Journal Entry Export
 * Generates accounting journal entries from a payroll run.
 * Output format: CSV compatible with most ERP systems (SAP, Oracle, QuickBooks).
 */

export interface GLEntry {
  date: string
  reference: string
  description: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  costCenter?: string
  department?: string
  employeeId?: string
}

export interface PayrollRunSummary {
  id: string
  periodMonth: number
  periodYear: number
  currency: string
  totalGross: number
  totalNet: number
  totalDeductions: number
  totalEmployerCost: number
  employeeCount: number
}

export interface GLAccountMapping {
  salaryExpense: string         // e.g. "5100 - Salary Expense"
  employeeTaxPayable: string    // e.g. "2300 - Employee Tax Payable"
  socialInsuranceExpense: string // e.g. "5200 - Social Insurance Expense"
  socialInsurancePayable: string // e.g. "2310 - Social Insurance Payable"
  gratuityExpense: string       // e.g. "5300 - Gratuity Expense"
  gratuityProvision: string     // e.g. "2320 - Gratuity Provision"
  netPayable: string            // e.g. "2100 - Salaries Payable"
  bankClearing: string          // e.g. "1100 - Bank Clearing"
}

const DEFAULT_ACCOUNTS: GLAccountMapping = {
  salaryExpense: '5100',
  employeeTaxPayable: '2300',
  socialInsuranceExpense: '5200',
  socialInsurancePayable: '2310',
  gratuityExpense: '5300',
  gratuityProvision: '2320',
  netPayable: '2100',
  bankClearing: '1100',
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function generateGLJournalEntries(
  run: PayrollRunSummary,
  accounts: Partial<GLAccountMapping> = {},
): GLEntry[] {
  const mapping = { ...DEFAULT_ACCOUNTS, ...accounts }
  const date = `${run.periodYear}-${pad2(run.periodMonth)}-${pad2(
    new Date(run.periodYear, run.periodMonth, 0).getDate(),
  )}`
  const ref = `PR-${run.periodYear}-${pad2(run.periodMonth)}`
  const desc = `Payroll ${run.periodMonth}/${run.periodYear} (${run.employeeCount} employees)`

  const grossSalary = run.totalGross
  const netPay = run.totalNet
  const deductions = grossSalary - netPay
  const employerCosts = run.totalEmployerCost

  const entries: GLEntry[] = [
    // 1. Recognize gross salary expense
    {
      date, reference: ref, description: `${desc} - Gross Salary`,
      accountCode: mapping.salaryExpense, accountName: 'Salary Expense',
      debit: grossSalary, credit: 0,
    },
    // 2. Deductions liability (taxes, social insurance held from employee)
    {
      date, reference: ref, description: `${desc} - Employee Deductions`,
      accountCode: mapping.employeeTaxPayable, accountName: 'Employee Tax Payable',
      debit: 0, credit: deductions,
    },
    // 3. Net payable to employees
    {
      date, reference: ref, description: `${desc} - Net Salaries Payable`,
      accountCode: mapping.netPayable, accountName: 'Salaries Payable',
      debit: 0, credit: netPay,
    },
    // 4. Employer social insurance cost
    ...(employerCosts > 0 ? [
      {
        date, reference: ref, description: `${desc} - Employer SI Expense`,
        accountCode: mapping.socialInsuranceExpense, accountName: 'Social Insurance Expense',
        debit: employerCosts, credit: 0,
      },
      {
        date, reference: ref, description: `${desc} - Employer SI Payable`,
        accountCode: mapping.socialInsurancePayable, accountName: 'Social Insurance Payable',
        debit: 0, credit: employerCosts,
      },
    ] : []),
  ]

  return entries
}

export function generateGLJournalCSV(entries: GLEntry[], currency: string): string {
  const header = [
    'Date', 'Reference', 'Description', 'Account Code', 'Account Name',
    `Debit (${currency})`, `Credit (${currency})`, 'Cost Center', 'Department',
  ].join(',')

  const rows = entries.map((e) => [
    e.date,
    e.reference,
    `"${e.description}"`,
    e.accountCode,
    `"${e.accountName}"`,
    e.debit > 0 ? e.debit.toFixed(2) : '',
    e.credit > 0 ? e.credit.toFixed(2) : '',
    e.costCenter ?? '',
    e.department ?? '',
  ].join(','))

  return [header, ...rows].join('\n')
}
