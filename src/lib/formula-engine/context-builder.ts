import { differenceInMonths, differenceInYears } from 'date-fns'
import type { FormulaContext } from './evaluator'
import type { Prisma } from '@prisma/client'

type EmployeeWithSalary = Prisma.EmployeeGetPayload<{
  include: {
    salaryStructure: {
      include: {
        components: { include: { component: true } }
      }
    }
  }
}>

interface ConfigMap {
  [key: string]: string
}

/**
 * Builds a variable context object from employee + salary + config data.
 * This context is passed into the formula evaluator for each payroll rule.
 */
export function buildFormulaContext(
  employee: EmployeeWithSalary,
  configValues: ConfigMap,
  periodYear: number,
  periodMonth: number
): FormulaContext {
  const salary = employee.salaryStructure
  const basicSalary = salary?.basicSalary ?? 0

  const joinDate = new Date(employee.joinDate)
  const periodDate = new Date(periodYear, periodMonth - 1, 1)

  const yearsOfService = differenceInYears(periodDate, joinDate)
  const monthsOfService = differenceInMonths(periodDate, joinDate)

  // Build component map: componentName → amount
  const componentMap: Record<string, number> = {}
  let totalAllowances = 0

  if (salary?.components) {
    for (const cv of salary.components) {
      const key = cv.component.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

      const amount = cv.isPercentage
        ? (basicSalary * cv.amount) / 100
        : cv.amount

      componentMap[key] = amount
      if (cv.component.type === 'EARNING') totalAllowances += amount
    }
  }

  const grossSalary = basicSalary + totalAllowances
  const daysInMonth = new Date(periodYear, periodMonth, 0).getDate()

  const context: FormulaContext = {
    basicSalary,
    grossSalary,
    yearsOfService,
    monthsOfService,
    daysInMonth,
    workedDays: daysInMonth,
    unpaidLeaveDays: 0,
    employmentType: employee.employmentType,
    ...componentMap,
  }

  // Merge config values (e.g. gosiRate, pfRate) — all converted to numbers
  for (const [key, value] of Object.entries(configValues)) {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      context[key] = num
    }
  }

  return context
}
