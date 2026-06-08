import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(4000),
})

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
})

// PII scrubber — removes names, emails, phone numbers, IBANs
function scrubPII(text: string): string {
  return text
    // Email addresses
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Phone numbers (various formats)
    .replace(/\+?[\d\s\-().]{10,}/g, '[PHONE]')
    // IBANs
    .replace(/[A-Z]{2}\d{2}[A-Z0-9]{4,}/g, '[IBAN]')
    // Saudi National ID / Iqama
    .replace(/\b[12]\d{9}\b/g, '[ID_NUMBER]')
    // Common PII patterns in Arabic names (approximation)
    .replace(/\b(Mr|Mrs|Ms|Dr)\.\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/g, '[NAME]')
}

const SYSTEM_PROMPT = `You are PayrollPro AI, an expert payroll assistant for HR and finance teams.

Your expertise covers:
- Payroll calculations and formulas for GCC countries (Saudi Arabia, UAE, Kuwait, Bahrain, Qatar, Oman)
- Social insurance systems: GOSI (SA), GPSSA (AE), PIFSS (KW), SIO (BH), GRSIA (QA), PASI (OM)
- Asian payroll: India (PF, ESIC, PT), Philippines (SSS, PhilHealth, Pag-IBIG), Singapore (CPF), Malaysia (EPF, SOCSO), Indonesia (BPJS), Japan
- North Africa: Egypt (Social Insurance), Morocco (CNSS, AMO), Tunisia (CNSS), Libya
- Italy: INPS, IRPEF, TFR

When writing formulas:
- Use simple arithmetic: +, -, *, /, (), max(), min(), round()
- Reference variables like: basicSalary, grossSalary, yearsOfService, daysInMonth, workedDays
- Always include the formula in a code block

Be concise, accurate, and practical. If rates have changed recently, acknowledge the date of your knowledge.
Never ask for or accept personal employee data (names, IDs, bank accounts).`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile?.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)

    const apiKey = process.env['OPENAI_API_KEY']
    if (!apiKey) {
      return error('CONFIG', 'AI assistant is not configured. Please add OPENAI_API_KEY to your environment.', 503)
    }

    const body: unknown = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    // Scrub PII from all user messages
    const scrubbedMessages = parsed.data.messages.map((m) => ({
      role: m.role,
      content: m.role === 'user' ? scrubPII(m.content) : m.content,
    }))

    // Log AI usage audit (without message content)
    await prisma.aiAuditLog.create({
      data: {
        userId: user.id,
        organizationId: profile.organizationId,
        userRole: profile.role,
        query: `[${scrubbedMessages.length} messages — PII scrubbed]`,
        wasAnswered: true,
        wasBlocked: false,
      },
    }).catch(() => {}) // Non-blocking

    // The `messages` param type from streamText requires non-undefined;
    // our scrubbedMessages array is always defined after the parse check.
    type StreamMessages = NonNullable<Parameters<typeof streamText>[0]['messages']>
    const result = streamText({
      model: openai('gpt-4o'),
      system: SYSTEM_PROMPT,
      messages: scrubbedMessages as StreamMessages,
      temperature: 0.3,
    })

    logger.info('AI chat request', {
      orgId: profile.organizationId,
      userId: user.id,
      messageCount: scrubbedMessages.length,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    logger.error('POST /api/ai/chat failed', { error: err })
    return error('SERVER_ERROR', 'AI assistant is temporarily unavailable. Please try again later.', 500)
  }
}
