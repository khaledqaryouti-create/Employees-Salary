import { Resend } from 'resend'
import { logger } from '@/lib/errors/logger'

const resend = new Resend(process.env['RESEND_API_KEY'])

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const from = opts.from ?? process.env['EMAIL_FROM'] ?? 'PayrollPro <noreply@payrollpro.app>'

  try {
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
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
