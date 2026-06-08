import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
  },
  companyMeta: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 4,
  },
  payslipTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textAlign: 'right',
  },
  payslipMeta: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 3,
  },
  // Employee info
  employeeSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  // Earnings / Deductions table
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  rowLabel: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
  },
  rowValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'right',
    minWidth: 80,
  },
  // Summary
  summarySection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#1e40af',
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    textAlign: 'right',
  },
  netPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#93c5fd',
  },
  netPayLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  netPayValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    textAlign: 'right',
  },
  // Footer
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
})

interface PayslipData {
  organizationName: string
  periodMonth: number
  periodYear: number
  employeeName: string
  employeeNumber: string
  jobTitle?: string | null
  department?: string | null
  country: string
  currency: string
  basicSalary: number
  earnings: Record<string, number>
  deductions: Record<string, number>
  grossPay: number
  totalDeductions: number
  netPay: number
  generatedAt?: Date
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency
}

export function PayslipDocument({ data }: { data: PayslipData }) {
  const earnings = Object.entries(data.earnings)
  const deductions = Object.entries(data.deductions)
  const monthName = MONTHS[(data.periodMonth - 1) % 12] ?? ''

  return (
    <Document title={`Payslip - ${data.employeeName} - ${monthName} ${data.periodYear}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{data.organizationName}</Text>
            <Text style={styles.companyMeta}>Payroll Statement</Text>
          </View>
          <View>
            <Text style={styles.payslipTitle}>PAYSLIP</Text>
            <Text style={styles.payslipMeta}>{monthName} {data.periodYear}</Text>
            <Text style={styles.payslipMeta}>Generated: {(data.generatedAt ?? new Date()).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Employee Info */}
        <View style={styles.employeeSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Employee Name</Text>
            <Text style={styles.infoValue}>{data.employeeName}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Employee Number</Text>
            <Text style={styles.infoValue}>{data.employeeNumber}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Job Title</Text>
            <Text style={styles.infoValue}>{data.jobTitle ?? '—'}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{data.department ?? '—'}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Country</Text>
            <Text style={styles.infoValue}>{data.country}</Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          {/* Basic Salary row */}
          <View style={styles.tableRow}>
            <Text style={styles.rowLabel}>Basic Salary</Text>
            <Text style={styles.rowValue}>{fmt(data.basicSalary, data.currency)}</Text>
          </View>
          {earnings.map(([name, amount], i) => (
            <View key={name} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowAlt : {}]}>
              <Text style={styles.rowLabel}>{name}</Text>
              <Text style={styles.rowValue}>{fmt(amount, data.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Deductions */}
        {deductions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            {deductions.map(([name, amount], i) => (
              <View key={name} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowAlt : {}]}>
                <Text style={styles.rowLabel}>{name}</Text>
                <Text style={[styles.rowValue, { color: '#dc2626' }]}>{fmt(amount, data.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gross Pay</Text>
            <Text style={styles.summaryValue}>{fmt(data.grossPay, data.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Deductions</Text>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
              − {fmt(data.totalDeductions, data.currency)}
            </Text>
          </View>
          <View style={styles.netPayRow}>
            <Text style={styles.netPayLabel}>NET PAY</Text>
            <Text style={styles.netPayValue}>{fmt(data.netPay, data.currency)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This payslip was generated automatically by the PayrollPro system.
          </Text>
          <Text style={styles.footerText}>
            {data.organizationName} · {monthName} {data.periodYear}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
