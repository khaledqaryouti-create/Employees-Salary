import { inngest } from './client'
import { prisma } from '@/lib/prisma/client'
import { runPayroll } from '@/lib/payroll-engine/engine'
import { sendEmail } from '@/lib/email/sender'
import { payslipReadyHtml, leaveStatusHtml } from '@/lib/email/templates'

// ── Background payroll processing ────────────────────────────────────────────

export const processPayrollRun = inngest.createFunction(
  {
    id: 'process-payroll-run',
    name: 'Process Payroll Run',
    retries: 2,
    triggers: { event: 'payroll/run.requested' },
  },
  async ({ event, step }) => {
    const payrollRunId = ((event as unknown) as { data: { payrollRunId: string } }).data.payrollRunId

    const payrollRun = await step.run('set-processing', async () => {
      const run = await prisma.payrollRun.update({
        where: { id: payrollRunId },
        data: { status: 'PROCESSING' },
      })
      return run
    })

    await step.run('execute-payroll', async () => {
      await runPayroll({
        payrollRunId: payrollRun.id,
        organizationId: payrollRun.organizationId,
        periodYear: payrollRun.periodYear,
        periodMonth: payrollRun.periodMonth,
        country: payrollRun.country ?? undefined,
      })
    })

    await step.run('set-pending-approval', async () => {
      await prisma.payrollRun.update({
        where: { id: payrollRunId },
        data: { status: 'PENDING_APPROVAL', processedAt: new Date() },
      })
    })

    return { payrollRunId, status: 'PENDING_APPROVAL' }
  },
)

// ── Send payslip notification emails ─────────────────────────────────────────

export const sendPayslipNotifications = inngest.createFunction(
  {
    id: 'send-payslip-notifications',
    name: 'Send Payslip Notifications',
    retries: 1,
    triggers: { event: 'payroll/payslip.notify' },
  },
  async ({ event, step }) => {
    const payrollRunId = ((event as unknown) as { data: { payrollRunId: string } }).data.payrollRunId

    const items = await step.run('fetch-payroll-items', async () => {
      return prisma.payrollItem.findMany({
        where: { payrollRunId, hasError: false },
        include: {
          employee: { include: { profile: true } },
          payrollRun: true,
        },
      })
    })

    let sent = 0
    for (const item of items) {
      const email = item.employee.profile?.email
      if (!email) continue

      await step.run(`notify-${item.id}`, async () => {
        const html = payslipReadyHtml({
          employeeName: item.employee.fullName,
          organizationName: 'Payroll System',
          periodMonth: item.payrollRun.periodMonth,
          periodYear: item.payrollRun.periodYear,
          netPay: item.netPay,
          currency: item.payrollRun.currency,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/payslips`,
        })
        await sendEmail({
          to: email,
          subject: `Your payslip for ${item.payrollRun.periodMonth}/${item.payrollRun.periodYear} is ready`,
          html,
        })
        sent++
      })
    }

    return { payrollRunId, emailsSent: sent }
  },
)

// ── Send leave status notification ───────────────────────────────────────────

export const sendLeaveStatusNotification = inngest.createFunction(
  {
    id: 'send-leave-notification',
    name: 'Send Leave Status Notification',
    retries: 1,
    triggers: { event: 'leave/status.updated' },
  },
  async ({ event, step }) => {
    const leaveRequestId = ((event as unknown) as { data: { leaveRequestId: string } }).data.leaveRequestId

    const leaveRequest = await step.run('fetch-leave', async () => {
      return prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        include: {
          employee: { include: { profile: true } },
          leaveType: true,
        },
      })
    })

    if (!leaveRequest) return { skipped: true }

    const email = leaveRequest.employee.profile?.email
    if (!email) return { skipped: true, reason: 'no email' }

    await step.run('send-email', async () => {
      const start = new Date(leaveRequest.startDate)
      const end = new Date(leaveRequest.endDate)
      const html = leaveStatusHtml({
        employeeName: leaveRequest.employee.fullName,
        leaveType: leaveRequest.leaveType.name,
        startDate: start.toLocaleDateString(),
        endDate: end.toLocaleDateString(),
        days: leaveRequest.days,
        status: leaveRequest.status as 'APPROVED' | 'REJECTED',
        reason: leaveRequest.rejectionReason ?? undefined,
      })
      await sendEmail({
        to: email,
        subject: `Leave Request ${leaveRequest.status}`,
        html,
      })
    })

    return { leaveRequestId, status: leaveRequest.status }
  },
)

export const inngestFunctions = [
  processPayrollRun,
  sendPayslipNotifications,
  sendLeaveStatusNotification,
]
