import { inngest } from './client'
import { prisma } from '@/lib/prisma/client'
import { runPayroll } from '@/lib/payroll-engine/engine'
import { sendEmail } from '@/lib/email/sender'
import { payslipReadyHtml, leaveStatusHtml } from '@/lib/email/templates'
import { calculateEmployeeProjectCost } from '@/lib/projects/cost-calculator'
import { getProjectCostReconciliation } from '@/lib/projects/reconciliation'
import { generateChecklist } from '@/lib/projects/safety-checklist-generator'
import {
  safetyRemindersScheduler,
  safetyDvrReviewRemind,
  safetyTrainingExpiryRemind,
  safetyCorrectiveActionOverdue,
} from './safety-reminders'

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

    const payrollRun = await step.run('set-processing', () =>
      prisma.payrollRun.update({
        where: { id: payrollRunId },
        data: { status: 'PROCESSING' },
      })
    )

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

    // Trigger project cost distribution after payroll is finalized
    await step.run('trigger-project-costs', async () => {
      const run = await prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: { organizationId: true, periodYear: true, periodMonth: true },
      })
      if (!run) return
      const periodStart = new Date(run.periodYear, run.periodMonth - 1, 1)
      const periodEnd   = new Date(run.periodYear, run.periodMonth, 0)
      await inngest.send({
        name: 'project/costs.calculate',
        data: {
          organizationId: run.organizationId,
          payrollRunId,
          periodStart: periodStart.toISOString(),
          periodEnd:   periodEnd.toISOString(),
        },
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

// ── Calculate project cost distributions ─────────────────────────────────────

export const calculateProjectCosts = inngest.createFunction(
  {
    id: 'calculate-project-costs',
    name: 'Calculate Project Costs',
    retries: 2,
    triggers: { event: 'project/costs.calculate' },
  },
  async ({ event, step }) => {
    const { organizationId, payrollRunId, periodStart, periodEnd } =
      ((event as unknown) as {
        data: {
          organizationId: string
          payrollRunId?: string
          periodStart: string
          periodEnd: string
        }
      }).data

    const pStart = new Date(periodStart)
    const pEnd   = new Date(periodEnd)

    // Step 1: fetch all active assignments overlapping this period
    const assignments = await step.run('fetch-assignments', () =>
      prisma.resourceAssignment.findMany({
        where: {
          organizationId,
          status: 'APPROVED',
          startDate: { lte: pEnd },
          OR: [{ endDate: null }, { endDate: { gte: pStart } }],
        },
        select: { id: true, employeeId: true, projectId: true, project: { select: { branchId: true } } },
      })
    )

    let processed = 0
    const warnings: string[] = []

    // Step 2 & 3: calculate and upsert cost distributions
    for (const assignment of assignments) {
      await step.run(`cost-${assignment.employeeId}-${assignment.projectId}`, async () => {
        const result = await calculateEmployeeProjectCost(
          assignment.employeeId,
          assignment.projectId,
          pStart,
          pEnd,
        )
        if (!result) return

        await prisma.costDistribution.upsert({
          where: {
            projectId_employeeId_periodStart_periodEnd: {
              projectId:   assignment.projectId,
              employeeId:  assignment.employeeId,
              periodStart: pStart,
              periodEnd:   pEnd,
            },
          },
          create: {
            organizationId,
            branchId:                  assignment.project.branchId,
            projectId:                 assignment.projectId,
            employeeId:                assignment.employeeId,
            periodStart:               pStart,
            periodEnd:                 pEnd,
            allocatedCost:             result.allocatedCost,
            calculationMode:           result.calculationMode,
            snapshotAllocationPct:     result.snapshotAllocationPct,
            snapshotTotalEmployeeCost: result.snapshotTotalEmployeeCost,
            payrollRunId:              payrollRunId ?? null,
          },
          update: {
            allocatedCost:             result.allocatedCost,
            calculationMode:           result.calculationMode,
            snapshotAllocationPct:     result.snapshotAllocationPct,
            snapshotTotalEmployeeCost: result.snapshotTotalEmployeeCost,
            payrollRunId:              payrollRunId ?? null,
          },
        })
        processed++
      })
    }

    // Step 4: reconciliation — surface gaps
    const reconciliation = await step.run('reconcile', () =>
      getProjectCostReconciliation(organizationId, pStart, pEnd)
    )

    for (const row of reconciliation) {
      if (Math.abs(row.gapPct) > 5) {
        warnings.push(
          `${row.employeeName}: distributed ${row.totalDistributed.toFixed(2)} of ${row.totalPayrollCost.toFixed(2)} (gap ${row.gapPct.toFixed(1)}%)`,
        )
      }
    }

    return { processed, reconciliationWarnings: warnings, periodStart, periodEnd }
  },
)

// ── Generate safety checklist for a project ──────────────────────────────────

export const generateSafetyChecklist = inngest.createFunction(
  {
    id:       'generate-safety-checklist',
    name:     'Generate Safety Checklist',
    retries:  2,
    triggers: { event: 'project/safety-checklist.generate' },
  },
  async ({ event, step }) => {
    const { projectId, organizationId } = (event as unknown as {
      data: { projectId: string; organizationId: string }
    }).data

    const result = await step.run('generate-checklist', async () => {
      const project = await prisma.project.findUnique({
        where:  { id: projectId },
        select: {
          projectType: true, countryId: true, hasElectricalWorks: true,
          hasMultipleContractors: true, branchId: true, startDate: true, managerId: true,
        },
      })
      if (!project) return { created: 0, updated: 0, deactivated: 0 }

      return generateChecklist(
        projectId,
        organizationId,
        project.branchId,
        {
          projectType:           project.projectType,
          countryId:             project.countryId,
          hasElectricalWorks:    project.hasElectricalWorks,
          hasMultipleContractors: project.hasMultipleContractors,
        },
        project.startDate,
        project.managerId ?? null,
      )
    })

    return { projectId, ...result }
  },
)

export const inngestFunctions = [
  processPayrollRun,
  sendPayslipNotifications,
  sendLeaveStatusNotification,
  calculateProjectCosts,
  generateSafetyChecklist,
  safetyRemindersScheduler,
  safetyDvrReviewRemind,
  safetyTrainingExpiryRemind,
  safetyCorrectiveActionOverdue,
]
