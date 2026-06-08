import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { z } from 'zod'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const schema = z.object({
  question: z.string().min(5).max(1000),
  country: z.string().optional(),
})

/**
 * Compliance knowledge base — static RAG-style context for each country/region.
 * In a production system, this would be stored in pgvector and retrieved via
 * semantic search. For MVP, we embed the key rules directly.
 */
const COMPLIANCE_KB: Record<string, string> = {
  SA: `Saudi Arabia Labor Law Highlights:
- End of Service: 1/3 monthly salary per year for first 5 years, 2/3 per year for 6-10 years, full salary per year after 10 years.
- GOSI (General Organization for Social Insurance): Employee 9.75%, Employer 11.75% (Saudi nationals only).
- Iqama holders (expatriates) are exempt from GOSI.
- Maximum working hours: 8h/day, 48h/week (40h in Ramadan).
- Overtime: 150% of hourly rate.
- Annual leave: 21 days (1-5 years), 30 days (5+ years).
- WPS (Wage Protection System) compliance mandatory.
- Notice period: 60 days for employees with 2+ years tenure.`,

  AE: `UAE Labour Law (Federal Decree Law No. 33 of 2021):
- End of Service Gratuity: 21 days per year for first 5 years, 30 days per year after.
- GPSSA (Abu Dhabi): Emirati employees 5% employee, 15% employer.
- DEWS (Dubai): For private sector (DIFC), alternative gratuity scheme.
- Working hours: 8h/day, 48h/week. Reduced by 2h during Ramadan.
- Overtime: 25% premium (normal), 50% (nights/holidays).
- WPS mandatory for all mainland employers.
- Unlimited vs limited contracts abolished; all are unlimited since Feb 2022.
- Probation: max 6 months; termination notice: 30-90 days.`,

  EG: `Egypt Labor Law No. 12 of 2003:
- Social Insurance: Employee 11%, Employer 18.75% of base salary.
- Income Tax: Progressive brackets 0%-25%.
- Working hours: 8h/day, 48h/week.
- Annual leave: 21 days (1-10 years), 30 days (10+ years) or age 50+.
- Overtime: 135% weekday, 175% holiday.
- Profit sharing: Mandatory 5% of net profits.`,

  IT: `Italy Labor Law:
- INPS (Social Security): Employee 9.19%, Employer ~30% (varies by sector).
- IRPEF (Income Tax): Progressive 23%-43%.
- TFR (Trattamento Fine Rapporto): 6.91% of gross annually accrued.
- 14th salary: Common in collective agreements.
- Working hours: 40h/week standard; max 48h with overtime.
- Annual leave: Minimum 4 weeks.
- Sick leave: First 3 days employer, then INPS covers.`,

  PH: `Philippines Labor Law:
- SSS: Employee 4.5%, Employer 9.5%.
- PhilHealth: 5% shared equally (employee 2.5%, employer 2.5%).
- Pag-IBIG: PHP 100 employee, PHP 100 employer.
- 13th Month Pay: Mandatory, 1/12 of annual basic salary.
- Overtime: 125% regular, 130% rest day, 200% holiday.
- Night differential: 110% (10pm-6am).
- Annual leave: 5 days Service Incentive Leave (SIL).`,

  IN: `India Labor Laws:
- PF (Provident Fund): 12% employee, 12% employer (on basic + DA).
- ESI: Employee 0.75%, Employer 3.25% (for salary < ₹21,000).
- Professional Tax: State-specific (typically ₹200/month max).
- Gratuity: 15 days salary per completed year (min 5 years service).
- Income Tax: Slabs 0%-30% + surcharge.
- TDS: Deducted at source monthly.`,

  MA: `Morocco Labor Law:
- CNSS: Employee 4.48%, Employer 10.64%.
- AMO (Health): Employee 2.26%, Employer 3.53%.
- CIMR (Pension): Voluntary, varies.
- Income Tax (IR): Progressive 0%-38%.
- Working hours: 2,288h/year (44h/week); reduced for sectors.
- Annual leave: 1.5 days/month (18 days/year minimum).
- Overtime: 125% daytime, 150% nighttime.`,
}

const COMPLIANCE_SYSTEM = `You are an expert payroll compliance advisor specializing in multi-country labor laws covering GCC, Asia, North Africa, and Europe (Italy). 

You provide accurate, actionable compliance guidance based on the provided knowledge base. Always:
1. Reference specific laws/regulations when possible
2. Flag if information might be outdated and recommend official verification
3. Structure responses clearly with bullet points
4. Highlight penalties or risks for non-compliance
5. Recommend professional legal advice for complex situations

Be concise but thorough. Focus on practical payroll implications.`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { question, country } = parsed.data

  // RAG: Retrieve relevant context from knowledge base
  const context = country && COMPLIANCE_KB[country.toUpperCase()]
    ? `RELEVANT COMPLIANCE KNOWLEDGE BASE:\n${COMPLIANCE_KB[country.toUpperCase()]}\n\n`
    : Object.entries(COMPLIANCE_KB)
        .filter(([code]) => question.toUpperCase().includes(code) || question.toLowerCase().includes(
          { SA: 'saudi', AE: 'uae|dubai|abu dhabi|emirates', EG: 'egypt', IT: 'italy|italian',
            PH: 'philippines|filipino', IN: 'india|indian', MA: 'morocco|moroccan' }[code] ?? ''
        ))
        .map(([, kb]) => kb)
        .join('\n\n')

  const prompt = context
    ? `${context}USER QUESTION: ${question}`
    : `USER QUESTION: ${question}`

  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: COMPLIANCE_SYSTEM,
      prompt,
      maxOutputTokens: 800,
      temperature: 0.2,
    })

    // Log audit
    if (profile.organizationId) {
      await prisma.aiAuditLog.create({
        data: {
          organizationId: profile.organizationId,
          userId: user.id,
          userRole: profile.role,
          page: 'COMPLIANCE_ADVISOR',
          query: question.substring(0, 500),
          wasAnswered: true,
          wasBlocked: false,
        },
      })
    }

    return NextResponse.json({
      answer: text,
      country,
      sources: country ? [`${country} Labor Law Knowledge Base`] : ['Multi-country KB'],
    })
  } catch (err) {
    console.error('[AI Compliance Error]', err)
    return NextResponse.json({ error: 'Failed to get compliance advice' }, { status: 500 })
  }
}
