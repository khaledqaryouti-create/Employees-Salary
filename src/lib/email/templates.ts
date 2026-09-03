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

export interface DvrReviewReminderEmailData {
  siteName: string
  nextReviewDate: string
  daysRemaining: number
  loginUrl: string
}

export interface TrainingExpiryReminderEmailData {
  employeeName: string
  trainingType: string
  siteName: string
  expiryDate: string
  daysRemaining: number
  loginUrl: string
}

export interface CorrectiveActionOverdueEmailData {
  assigneeName: string
  actionTitle: string
  siteName: string
  dueDate: string
  daysPastDue: number
  loginUrl: string
}

export function dvrReviewReminderHtml(data: DvrReviewReminderEmailData): string {
  const urgency =
    data.daysRemaining <= 7
      ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', label: 'URGENT' }
      : data.daysRemaining <= 14
        ? { bg: '#fffbeb', border: '#fde68a', text: '#92400e', label: 'ACTION REQUIRED' }
        : { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', label: 'UPCOMING' }

  return baseTemplate(
    `DVR Review Due in ${data.daysRemaining} days — ${data.siteName}`,
    `<h2 style="color: #111827; margin-top: 0;">DVR Annual Review Due</h2>
    <p style="color: #374151;">The Document of Risk Assessment (DVR) for <strong>${data.siteName}</strong> is due for its periodic review.</p>
    <div style="background: ${urgency.bg}; border: 1px solid ${urgency.border}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 4px; font-size: 12px; font-weight: bold; color: ${urgency.text}; text-transform: uppercase; letter-spacing: 0.05em;">${urgency.label}</p>
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${urgency.text};">${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'} remaining</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #374151;">Review due by: <strong>${data.nextReviewDate}</strong></p>
    </div>
    <p style="color: #374151; font-size: 14px;">Please log in to the system to initiate a new review cycle and ensure all risk assessments are up to date.</p>
    <a href="${data.loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open DVR</a>`
  )
}

export function trainingExpiryReminderHtml(data: TrainingExpiryReminderEmailData): string {
  const urgent = data.daysRemaining <= 14
  const bandBg = urgent ? '#fef2f2' : '#fffbeb'
  const bandBorder = urgent ? '#fecaca' : '#fde68a'
  const bandText = urgent ? '#991b1b' : '#92400e'

  return baseTemplate(
    `Training Record Expiring — ${data.siteName}`,
    `<h2 style="color: #111827; margin-top: 0;">Training Record Expiring Soon</h2>
    <p style="color: #374151;">Dear ${data.employeeName},</p>
    <p style="color: #374151;">Your <strong>${data.trainingType}</strong> training record for site <strong>${data.siteName}</strong> is expiring soon.</p>
    <div style="background: ${bandBg}; border: 1px solid ${bandBorder}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 4px; font-size: 14px; color: ${bandText};">Expires on: <strong>${data.expiryDate}</strong></p>
      <p style="margin: 0; font-size: 14px; color: ${bandText};">${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'} remaining</p>
    </div>
    <p style="color: #374151; font-size: 14px;">Please arrange a renewal training session and update the record in the system.</p>
    <a href="${data.loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Training Records</a>`
  )
}

export function correctiveActionOverdueHtml(data: CorrectiveActionOverdueEmailData): string {
  return baseTemplate(
    `Overdue Corrective Action — ${data.siteName}`,
    `<h2 style="color: #111827; margin-top: 0;">Corrective Action Overdue</h2>
    <p style="color: #374151;">Dear ${data.assigneeName},</p>
    <p style="color: #374151;">A corrective action assigned to you for site <strong>${data.siteName}</strong> is overdue.</p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 4px; font-size: 16px; font-weight: bold; color: #991b1b;">${data.actionTitle}</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #374151;">Due date: <strong>${data.dueDate}</strong></p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #dc2626;"><strong>${data.daysPastDue} day${data.daysPastDue === 1 ? '' : 's'} overdue</strong></p>
    </div>
    <p style="color: #374151; font-size: 14px;">Please complete this action or update its status in the system as soon as possible.</p>
    <a href="${data.loginUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Corrective Actions</a>`
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
      <p style="margin: 0; font-size: 14px;"><strong>Duration:</strong> ${data.days} day${data.days === 1 ? '' : 's'}</p>
      ${data.reason ? `<p style="margin: 8px 0 0; font-size: 14px;"><strong>Note:</strong> ${data.reason}</p>` : ''}
    </div>`
  )
}
