export interface PayslipReadyEmailData {
  employeeName: string
  organizationName: string
  periodMonth: number
  periodYear: number
  netPay: number
  currency: string
  loginUrl: string
}

export interface PayrollApprovedEmailData {
  approverName: string
  organizationName: string
  periodMonth: number
  periodYear: number
  totalNetPay: number
  currency: string
  employeeCount: number
}

export interface LeaveApprovedEmailData {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: 'APPROVED' | 'REJECTED'
  reason?: string
}

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
  <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #2563eb; padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px;">PayrollPro</h1>
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">This is an automated message from PayrollPro. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`
}

export function payslipReadyHtml(data: PayslipReadyEmailData): string {
  const month = MONTHS[data.periodMonth] ?? ''
  return baseTemplate(
    `Your Payslip for ${month} ${data.periodYear}`,
    `<h2 style="color: #111827; margin-top: 0;">Your Payslip is Ready</h2>
    <p style="color: #374151;">Dear ${data.employeeName},</p>
    <p style="color: #374151;">Your payslip for <strong>${month} ${data.periodYear}</strong> is now available.</p>
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        Net Pay: <strong style="font-size: 20px;">${new Intl.NumberFormat().format(data.netPay)} ${data.currency}</strong>
      </p>
    </div>
    <a href="${data.loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Download Payslip</a>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">— ${data.organizationName} Payroll Team</p>`
  )
}

export function leaveStatusHtml(data: LeaveApprovedEmailData): string {
  const statusColor = data.status === 'APPROVED' ? '#16a34a' : '#dc2626'
  return baseTemplate(
    `Leave Request ${data.status}`,
    `<h2 style="color: #111827; margin-top: 0;">Leave Request ${data.status}</h2>
    <p style="color: #374151;">Dear ${data.employeeName},</p>
    <p style="color: #374151;">Your <strong>${data.leaveType}</strong> leave request has been 
    <strong style="color: ${statusColor};">${data.status.toLowerCase()}</strong>.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 14px;"><strong>From:</strong> ${data.startDate}</p>
      <p style="margin: 0 0 8px; font-size: 14px;"><strong>To:</strong> ${data.endDate}</p>
      <p style="margin: 0; font-size: 14px;"><strong>Duration:</strong> ${data.days} day${data.days !== 1 ? 's' : ''}</p>
      ${data.reason ? `<p style="margin: 8px 0 0; font-size: 14px;"><strong>Note:</strong> ${data.reason}</p>` : ''}
    </div>`
  )
}
