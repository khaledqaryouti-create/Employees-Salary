import { inngest } from './client'
import { prisma } from '@/lib/prisma/client'
import { sendEmail } from '@/lib/email/sender'
import {
  dvrReviewReminderHtml,
  trainingExpiryReminderHtml,
  correctiveActionOverdueHtml,
} from '@/lib/email/templates'

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? ''

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Helpers for repeat-frequency enforcement ─────────────────────────────────

function parseDays(raw: string): number[] {
  return raw.split(',').map((s) => Number.parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n > 0)
}

function repeatCutoff(frequency: string): Date | null {
  const now = new Date()
  if (frequency === 'DAILY')  { now.setHours(now.getHours() - 23); return now }
  if (frequency === 'WEEKLY') { now.setDate(now.getDate() - 6);    return now }
  return null // ONCE — any existing log means skip
}

async function shouldSend(
  organizationId: string,
  reminderType: string,
  entityId: string,
  frequency: string,
): Promise<boolean> {
  const existing = await prisma.safetyReminderLog.findUnique({
    where: { organizationId_reminderType_entityId: { organizationId, reminderType, entityId } },
  })
  if (!existing) return true
  const cutoff = repeatCutoff(frequency)
  if (cutoff === null) return false // ONCE and already sent
  return existing.lastSentAt < cutoff
}

async function markSent(organizationId: string, reminderType: string, entityId: string): Promise<void> {
  await prisma.safetyReminderLog.upsert({
    where:  { organizationId_reminderType_entityId: { organizationId, reminderType, entityId } },
    create: { organizationId, reminderType, entityId },
    update: { lastSentAt: new Date() },
  })
}

// ── Per-org reminder builders (extracted to reduce cognitive complexity) ──────

type OrgSettings = {
  organizationId: string
  dvrReminderEnabled: boolean
  trainingReminderEnabled: boolean
  actionReminderEnabled: boolean
  dvrReminderDays: string
  trainingReminderDays: string
  actionGraceDays: number
  reminderRepeatFrequency: string
}

type DvrRow      = { id: string; siteId: string; organizationId: string; nextReviewDate: Date | null }
type TrainRow    = { id: string; siteId: string; organizationId: string; trainingType: string; expiryDate: Date | null; employeeId: string | null; site: { name: string } }
type ActionRow   = { id: string; siteId: string; organizationId: string; title: string; dueDate: Date | null; assignedToId: string | null; site: { name: string } }

async function buildDvrEvent(d: DvrRow, s: OrgSettings, today: Date) {
  if (!d.nextReviewDate || !s.dvrReminderEnabled) return null
  const daysLeft = daysBetween(today, d.nextReviewDate)
  if (!parseDays(s.dvrReminderDays).includes(daysLeft)) return null
  if (!(await shouldSend(d.organizationId, 'DVR_REVIEW', d.id, s.reminderRepeatFrequency))) return null
  await markSent(d.organizationId, 'DVR_REVIEW', d.id)
  return { name: 'safety/dvr-review.remind' as const, data: { dvrId: d.id, siteId: d.siteId, organizationId: d.organizationId, nextReviewDate: d.nextReviewDate.toISOString(), daysRemaining: daysLeft } }
}

async function buildTrainingEvent(r: TrainRow, s: OrgSettings, today: Date) {
  if (!r.expiryDate || !r.employeeId || !s.trainingReminderEnabled) return null
  const daysLeft = daysBetween(today, r.expiryDate)
  if (!parseDays(s.trainingReminderDays).includes(daysLeft)) return null
  if (!(await shouldSend(r.organizationId, 'TRAINING_EXPIRY', r.id, s.reminderRepeatFrequency))) return null
  await markSent(r.organizationId, 'TRAINING_EXPIRY', r.id)
  return { name: 'safety/training.remind' as const, data: { recordId: r.id, siteId: r.siteId, organizationId: r.organizationId, siteName: r.site.name, trainingType: r.trainingType, expiryDate: r.expiryDate.toISOString(), daysRemaining: daysLeft, employeeId: r.employeeId } }
}

async function buildActionEvent(a: ActionRow, s: OrgSettings, today: Date) {
  if (!a.dueDate || !s.actionReminderEnabled) return null
  const pastDue = daysBetween(a.dueDate, today)
  if (pastDue < s.actionGraceDays) return null
  if (!(await shouldSend(a.organizationId, 'ACTION_OVERDUE', a.id, s.reminderRepeatFrequency))) return null
  await markSent(a.organizationId, 'ACTION_OVERDUE', a.id)
  return { name: 'safety/corrective-action.overdue' as const, data: { actionId: a.id, siteId: a.siteId, organizationId: a.organizationId, siteName: a.site.name, title: a.title, dueDate: a.dueDate.toISOString(), daysPastDue: pastDue, assignedToId: a.assignedToId! } }
}

// ── Hourly scheduler: per-org dynamic config ─────────────────────────────────

export const safetyRemindersScheduler = inngest.createFunction(
  {
    id: 'safety-reminders-scheduler',
    name: 'Safety Reminders Scheduler',
    retries: 1,
    triggers: [{ cron: '0 * * * *' }],
  } as Parameters<typeof inngest.createFunction>[0],
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T> | T) => Promise<T> } }) => {
    const currentHour = new Date().getUTCHours()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const allSettings = await step.run('fetch-org-settings', () =>
      prisma.organizationEmailSettings.findMany({
        select: {
          organizationId: true, schedulerEnabled: true, schedulerHour: true,
          dvrReminderDays: true, trainingReminderDays: true,
          actionGraceDays: true, reminderRepeatFrequency: true,
          dvrReminderEnabled: true, trainingReminderEnabled: true, actionReminderEnabled: true,
        },
      })
    )

    const activeOrgs = new Map(
      allSettings
        .filter((s) => s.schedulerEnabled && s.schedulerHour === currentHour)
        .map((s) => [s.organizationId, s])
    )

    if (activeOrgs.size === 0) {
      return { skipped: true, reason: `No orgs scheduled for hour ${currentHour}` }
    }

    const maxDvrDays   = Math.max(...allSettings.flatMap((s) => parseDays(s.dvrReminderDays)),   30)
    const maxTrainDays = Math.max(...allSettings.flatMap((s) => parseDays(s.trainingReminderDays)), 30)

    const inMaxDvr   = new Date(today); inMaxDvr.setDate(today.getDate() + maxDvrDays)
    const inMaxTrain = new Date(today); inMaxTrain.setDate(today.getDate() + maxTrainDays)
    const orgIds     = [...activeOrgs.keys()]

    const [dvrsDue, trainingDue, overdueActions] = await Promise.all([
      step.run('find-dvr-due', () =>
        prisma.dvrSetup.findMany({
          where: { nextReviewDate: { gte: today, lte: inMaxDvr }, organizationId: { in: orgIds } },
          select: { id: true, siteId: true, organizationId: true, nextReviewDate: true },
        })
      ),
      step.run('find-training-expiring', () =>
        prisma.siteTrainingRecord.findMany({
          where: { expiryDate: { gte: today, lte: inMaxTrain }, status: { in: ['VALID', 'EXPIRING_SOON'] }, organizationId: { in: orgIds } },
          select: { id: true, siteId: true, organizationId: true, trainingType: true, expiryDate: true, employeeId: true, site: { select: { name: true } } },
        })
      ),
      step.run('find-overdue-actions', () =>
        prisma.correctiveAction.findMany({
          where: { dueDate: { lt: today }, status: { in: ['OPEN', 'IN_PROGRESS'] }, assignedToId: { not: null }, organizationId: { in: orgIds } },
          select: { id: true, siteId: true, organizationId: true, title: true, dueDate: true, assignedToId: true, site: { select: { name: true } } },
        })
      ),
    ])

    const dvrEventResults    = await Promise.all(dvrsDue.map((d)    => buildDvrEvent(d,    activeOrgs.get(d.organizationId)!,    today)))
    const trainEventResults  = await Promise.all(trainingDue.map((r) => buildTrainingEvent(r, activeOrgs.get(r.organizationId)!, today)))
    const actionEventResults = await Promise.all(overdueActions.map((a) => buildActionEvent(a, activeOrgs.get(a.organizationId)!, today)))

    const dvrEvents    = dvrEventResults.filter(Boolean)
    const trainEvents  = trainEventResults.filter(Boolean)
    const actionEvents = actionEventResults.filter(Boolean)

    if (dvrEvents.length > 0)    await step.run('fire-dvr-events',    () => inngest.send(dvrEvents    as Parameters<typeof inngest.send>[0]))
    if (trainEvents.length > 0)  await step.run('fire-training-events', () => inngest.send(trainEvents  as Parameters<typeof inngest.send>[0]))
    if (actionEvents.length > 0) await step.run('fire-action-events',  () => inngest.send(actionEvents as Parameters<typeof inngest.send>[0]))

    return {
      hour: currentHour,
      activeOrgs: activeOrgs.size,
      dvrReminders: dvrEvents.length,
      trainingReminders: trainEvents.length,
      overdueActions: actionEvents.length,
    }
  },
)

// ── DVR review reminder ───────────────────────────────────────────────────────

export const safetyDvrReviewRemind = inngest.createFunction(
  {
    id: 'safety-dvr-review-remind',
    name: 'Safety DVR Review Reminder',
    retries: 1,
    triggers: { event: 'safety/dvr-review.remind' },
  },
  async ({ event, step }) => {
    const { dvrId, siteId, organizationId, nextReviewDate, daysRemaining } = (
      event as unknown as {
        data: {
          dvrId: string
          siteId: string
          organizationId: string
          nextReviewDate: string
          daysRemaining: number
        }
      }
    ).data

    const emailSettings = await step.run('check-dvr-toggle', () =>
      prisma.organizationEmailSettings.findUnique({ where: { organizationId } })
    )
    if (emailSettings && !emailSettings.dvrReminderEnabled) {
      return { dvrId, skipped: true, reason: 'disabled' }
    }

    const recipients = await step.run('fetch-recipients', () =>
      prisma.safetyRoleAppointment.findMany({
        where: {
          siteId,
          roleType: { in: ['RSPP', 'EMPLOYER'] },
          isActive: true,
        },
        select: {
          roleType: true,
          externalName: true,
          employee: {
            select: { profile: { select: { email: true } }, fullName: true },
          },
          site: { select: { name: true } },
        },
      })
    )

    const siteName = recipients[0]?.site.name ?? siteId
    const reviewDate = new Date(nextReviewDate)
    const loginUrl = `${APP_URL}/settings/sites/${siteId}`

    let sent = 0
    for (const r of recipients) {
      const email = r.employee?.profile?.email
      if (!email) continue

      await step.run(`send-dvr-remind-${r.roleType}`, async () => {
        const html = dvrReviewReminderHtml({
          siteName,
          nextReviewDate: formatDate(reviewDate),
          daysRemaining,
          loginUrl,
        })
        await sendEmail({
          to:    email,
          orgId: organizationId,
          subject: `DVR Review Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — ${siteName}`,
          html,
        })
        sent++
      })
    }

    return { dvrId, recipientsSent: sent }
  },
)

// ── Training expiry reminder ──────────────────────────────────────────────────

export const safetyTrainingExpiryRemind = inngest.createFunction(
  {
    id: 'safety-training-expiry-remind',
    name: 'Safety Training Expiry Reminder',
    retries: 1,
    triggers: { event: 'safety/training.remind' },
  },
  async ({ event, step }) => {
    const { recordId, organizationId, siteName, trainingType, expiryDate, daysRemaining, employeeId } = (
      event as unknown as {
        data: {
          recordId: string
          siteId: string
          organizationId: string
          siteName: string
          trainingType: string
          expiryDate: string
          daysRemaining: number
          employeeId: string
        }
      }
    ).data

    const emailSettings = await step.run('check-training-toggle', () =>
      prisma.organizationEmailSettings.findUnique({ where: { organizationId } })
    )
    if (emailSettings && !emailSettings.trainingReminderEnabled) {
      return { recordId, skipped: true, reason: 'disabled' }
    }

    const employee = await step.run('fetch-employee', () =>
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { fullName: true, profile: { select: { email: true } } },
      })
    )

    const email = employee?.profile?.email
    if (!email) return { recordId, skipped: true, reason: 'no email' }

    const expiry = new Date(expiryDate)
    const loginUrl = `${APP_URL}/settings/sites`

    await step.run('send-training-remind', async () => {
      const html = trainingExpiryReminderHtml({
        employeeName: employee?.fullName ?? 'Employee',
        trainingType,
        siteName,
        expiryDate: formatDate(expiry),
        daysRemaining,
        loginUrl,
      })
      await sendEmail({
        to:    email,
        orgId: organizationId,
        subject: `Training Record Expiring in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — ${siteName}`,
        html,
      })
    })

    return { recordId, sent: true }
  },
)

// ── Corrective action overdue reminder ───────────────────────────────────────

export const safetyCorrectiveActionOverdue = inngest.createFunction(
  {
    id: 'safety-corrective-action-overdue',
    name: 'Safety Corrective Action Overdue',
    retries: 1,
    triggers: { event: 'safety/corrective-action.overdue' },
  },
  async ({ event, step }) => {
    const { actionId, organizationId, siteName, title, dueDate, daysPastDue, assignedToId } = (
      event as unknown as {
        data: {
          actionId: string
          siteId: string
          organizationId: string
          siteName: string
          title: string
          dueDate: string
          daysPastDue: number
          assignedToId: string
        }
      }
    ).data

    const emailSettings = await step.run('check-action-toggle', () =>
      prisma.organizationEmailSettings.findUnique({ where: { organizationId } })
    )
    if (emailSettings && !emailSettings.actionReminderEnabled) {
      return { actionId, skipped: true, reason: 'disabled' }
    }

    const employee = await step.run('fetch-assignee', () =>
      prisma.employee.findUnique({
        where: { id: assignedToId },
        select: { fullName: true, profile: { select: { email: true } } },
      })
    )

    const email = employee?.profile?.email
    if (!email) return { actionId, skipped: true, reason: 'no email' }

    const due = new Date(dueDate)
    const loginUrl = `${APP_URL}/settings/sites`

    await step.run('send-overdue-remind', async () => {
      const html = correctiveActionOverdueHtml({
        assigneeName: employee?.fullName ?? 'Assignee',
        actionTitle: title,
        siteName,
        dueDate: formatDate(due),
        daysPastDue,
        loginUrl,
      })
      await sendEmail({
        to:    email,
        orgId: organizationId,
        subject: `Overdue Corrective Action — ${siteName}`,
        html,
      })
    })

    return { actionId, sent: true }
  },
)
