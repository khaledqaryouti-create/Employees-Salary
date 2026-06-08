import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { z } from 'zod'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const schema = z.object({
  description: z.string().min(10).max(500),
  country: z.string().optional(),
  ruleType: z.enum(['EARNING', 'DEDUCTION', 'EMPLOYER_COST']),
  existingVariables: z.array(z.string()).optional(),
})

const FORMULA_SYSTEM = `You are a payroll formula expert. Given a plain-language description of a payroll rule, generate a valid mathematical formula using mathjs syntax.

Available variables: grossSalary, basicSalary, housingAllowance, transportAllowance, workingDays, workedDays, overtime, yearsOfService, taxableIncome, socialInsurance, and any custom variable names the user provides.

Rules:
- Return ONLY the formula, no explanation
- Use standard arithmetic operators: +, -, *, /, (, )
- Use conditional: ternary-style not available; use min(), max(), if(condition, then, else)  
- Round using round(value, 2)
- Example: "10% of basic salary" → round(basicSalary * 0.10, 2)
- Example: "25% of gross for housing if gross > 5000 else 20%" → round(grossSalary * if(grossSalary > 5000, 0.25, 0.20), 2)
- Example: "End of service = 21 days per year for first 5 years, 30 days after" → round(basicSalary / 30 * if(yearsOfService <= 5, yearsOfService * 21, 5 * 21 + (yearsOfService - 5) * 30), 2)

Return only the formula expression.`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  const allowedRoles = ['ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { description, country, ruleType, existingVariables } = parsed.data

  const userPrompt = [
    `Rule type: ${ruleType}`,
    country ? `Country: ${country}` : null,
    existingVariables?.length ? `Custom variables available: ${existingVariables.join(', ')}` : null,
    `Description: ${description}`,
  ].filter(Boolean).join('\n')

  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: FORMULA_SYSTEM,
      prompt: userPrompt,
      maxOutputTokens: 200,
      temperature: 0.1,
    })

    const formula = text.trim().replace(/^`+|`+$/g, '').trim()

    // Log for audit
    if (profile.organizationId) {
      await prisma.aiAuditLog.create({
        data: {
          organizationId: profile.organizationId,
          userId: user.id,
          userRole: profile.role,
          page: 'FORMULA_GENERATOR',
          query: description,
          wasAnswered: true,
          wasBlocked: false,
        },
      })
    }

    return NextResponse.json({ formula })
  } catch (err) {
    console.error('[AI Formula Error]', err)
    return NextResponse.json({ error: 'Failed to generate formula' }, { status: 500 })
  }
}
