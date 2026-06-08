/**
 * WPS (Wages Protection System) SIF file generator.
 * Used in Saudi Arabia and UAE for mandatory salary transfer reporting.
 * Format: Fixed-width or pipe-delimited text file.
 */

export interface WPSEmployee {
  employeeNumber: string
  fullName: string
  iban: string
  basicSalary: number
  allowances: number
  deductions: number
  netPay: number
  currency: string
  bankCode?: string
}

export interface WPSHeader {
  employerReference: string
  periodMonth: number
  periodYear: number
  totalEmployees: number
  totalAmount: number
  currency: string
}

/**
 * Generate a SIF (Salary Information File) in the standard WPS format.
 * Returns the file content as a string.
 */
export function generateWPSSIF(header: WPSHeader, employees: WPSEmployee[]): string {
  const lines: string[] = []

  // Header record
  const paddedRef = header.employerReference.padEnd(20, ' ')
  const period = `${String(header.periodYear)}${String(header.periodMonth).padStart(2, '0')}`
  const total = header.totalAmount.toFixed(2).padStart(18, '0')
  const count = String(header.totalEmployees).padStart(8, '0')
  lines.push(`HDR${paddedRef}${period}${total}${count}${header.currency}`)

  // Employee detail records
  for (const emp of employees) {
    const empNum = emp.employeeNumber.padEnd(20, ' ')
    const name = emp.fullName.substring(0, 50).padEnd(50, ' ')
    const iban = emp.iban.padEnd(34, ' ')
    const basic = emp.basicSalary.toFixed(2).padStart(16, '0')
    const allowance = emp.allowances.toFixed(2).padStart(16, '0')
    const deduction = emp.deductions.toFixed(2).padStart(16, '0')
    const net = emp.netPay.toFixed(2).padStart(16, '0')
    lines.push(`DTL${empNum}${name}${iban}${basic}${allowance}${deduction}${net}${emp.currency}`)
  }

  // Trailer record
  lines.push(`TRL${count}${total}`)

  return lines.join('\r\n')
}

/**
 * Generate a CSV variant of the WPS SIF for review/audit.
 */
export function generateWPSCSV(header: WPSHeader, employees: WPSEmployee[]): string {
  const headers = ['Employee Number', 'Full Name', 'IBAN', 'Basic Salary', 'Allowances', 'Deductions', 'Net Pay', 'Currency']
  const rows = employees.map((emp) => [
    emp.employeeNumber,
    `"${emp.fullName.replace(/"/g, '""')}"`,
    emp.iban,
    emp.basicSalary.toFixed(2),
    emp.allowances.toFixed(2),
    emp.deductions.toFixed(2),
    emp.netPay.toFixed(2),
    emp.currency,
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}
