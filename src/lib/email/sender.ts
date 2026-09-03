import { Resend } from 'resend'
import { logger } from '@/lib/errors/logger'
import { prisma } from '@/lib/prisma/client'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  orgId?: string
  attachments?: { filename: string; content: Buffer | Uint8Array }[]
}

async function resolveFrom(opts: SendEmailOptions): Promise<string> {
  if (opts.from) return opts.from

  if (opts.orgId) {
    const settings = await prisma.organizationEmailSettings.findUnique({
      where:  { organizationId: opts.orgId },
      select: { fromName: true, fromEmail: true },
    })
    if (settings) return `${settings.fromName} <${settings.fromEmail}>`
  }

  return process.env['EMAIL_FROM'] ?? 'PayrollPro <noreply@payrollpro.app>'
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) {
    logger.error('RESEND_API_KEY is not set — email not sent', { to: opts.to })
    return false
  }

  const resend = new Resend(apiKey)
  const from = await resolveFrom(opts)

  try {
    const { error } = await resend.emails.send({
      from,
      to:          opts.to,
      subject:     opts.subject,
      html:        opts.html,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content:  Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      })),
    })

    if (error) {
      logger.error('Email send failed', { to: opts.to, subject: opts.subject, error })
      return false
    }

    logger.info('Email sent', { to: opts.to, subject: opts.subject })
    return true
  } catch (err) {
    logger.error('Email send exception', { to: opts.to, error: err })
    return false
  }
}
