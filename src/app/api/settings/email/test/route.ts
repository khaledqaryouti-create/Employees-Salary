import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { sendEmail } from '@/lib/email/sender'
import { dvrReviewReminderHtml } from '@/lib/email/templates'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:8080'

export async function POST() {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    if (!process.env['RESEND_API_KEY']) {
      return error('NOT_CONFIGURED', 'RESEND_API_KEY is not set — configure it in your environment variables', 400)
    }

    const recipientEmail = profile.email
    if (!recipientEmail) {
      return error('NO_EMAIL', 'Your profile does not have an email address', 400)
    }

    const settings = await prisma.organizationEmailSettings.findUnique({
      where: { organizationId: orgId },
    })

    const fromName  = settings?.fromName  ?? 'PayrollPro'
    const fromEmail = settings?.fromEmail ?? 'noreply@payrollpro.app'

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 7)
    const reviewDate = tomorrow.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    const html = dvrReviewReminderHtml({
      siteName:       'Test Site (Demo)',
      nextReviewDate: reviewDate,
      daysRemaining:  7,
      loginUrl:       `${APP_URL}/settings/sites`,
    })

    const sent = await sendEmail({
      to:      recipientEmail,
      subject: `[TEST] DVR Review Due in 7 days — Test Site`,
      html,
      from:    `${fromName} <${fromEmail}>`,
    })

    if (!sent) {
      logger.error('email-settings.test.failed', { orgId, to: recipientEmail })
      return error('SEND_FAILED', 'Email could not be sent. Check your RESEND_API_KEY and from address.', 500)
    }

    logger.info('email-settings.test.sent', { orgId, to: recipientEmail })
    return success({ sent: true, to: recipientEmail })
  } catch (err) {
    logger.error('email-settings.test.error', { error: err })
    return handlePrismaError(err)
  }
}
