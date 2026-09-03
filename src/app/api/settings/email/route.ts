import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateEmailSettingsSchema = z.object({
  fromName:                z.string().min(1).max(100).optional(),
  fromEmail:               z.string().email().optional(),
  dvrReminderEnabled:      z.boolean().optional(),
  trainingReminderEnabled: z.boolean().optional(),
  actionReminderEnabled:   z.boolean().optional(),
  schedulerEnabled:        z.boolean().optional(),
  schedulerHour:           z.number().int().min(0).max(23).optional(),
  dvrReminderDays:         z.string().optional(),
  trainingReminderDays:    z.string().optional(),
  actionGraceDays:         z.number().int().min(0).max(30).optional(),
  reminderRepeatFrequency: z.enum(['ONCE', 'DAILY', 'WEEKLY']).optional(),
})

export async function GET() {
  try {
    const { orgId } = await getProfileOrRedirect()

    const settings = await prisma.organizationEmailSettings.upsert({
      where:  { organizationId: orgId },
      create: { organizationId: orgId },
      update: {},
    })

    const resendConfigured = Boolean(process.env['RESEND_API_KEY'])

    return success({ ...settings, resendConfigured })
  } catch (err) {
    logger.error('email-settings.get', { error: err })
    return handlePrismaError(err)
  }
}

export async function PATCH(request: Request) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const body   = await request.json() as unknown
    const parsed = updateEmailSettingsSchema.parse(body)

    const settings = await prisma.organizationEmailSettings.upsert({
      where:  { organizationId: orgId },
      create: { organizationId: orgId, ...parsed },
      update: parsed,
    })

    return success(settings)
  } catch (err) {
    logger.error('email-settings.patch', { error: err })
    return handlePrismaError(err)
  }
}
