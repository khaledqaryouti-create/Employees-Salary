import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { z } from 'zod'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const schema = z.object({
  runId: z.string(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || !profile.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const allowedRoles = ['ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN']
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { runId } = parsed.data
  const orgId = profile.organizationId

  // Fetch current run
  const currentRun = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId: orgId },
    include: {
      items: {
        include: { employee: { select: { fullName: true, country: true, jobTitle: true } } },
        where: { hasError: false },
      },
    },
  })
  if (!currentRun) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  // Fetch previous run for comparison
  const prevRun = await prisma.payrollRun.findFirst({
    where: {
      organizationId: orgId,
      status: 'APPROVED',
      id: { not: runId },
    },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    include: {
      items: {
        where: { hasError: false },
        include: { employee: { select: { country: true, jobTitle: true } } },
      },
    },
  })

  // Build anonymized summary for AI
  type ItemWithEmployee = { employee: { country: string; jobTitle: string | null }; grossPay: number; netPay: number; totalDeductions: number }
  const buildSummary = (items: ItemWithEmployee[]) =>
    items.map((item) => ({
      country: item.employee.country,
      jobTitle: item.employee.jobTitle ?? 'Staff',
      grossPay: item.grossPay,
      netPay: item.netPay,
      deductions: item.totalDeductions,
    }))

  const currentSummary = buildSummary(currentRun.items)
  const prevSummary = prevRun ? buildSummary(prevRun.items) : []

  const prompt = `Analyze the following payroll data for anomalies. Compare current vs previous period if available.

CURRENT PERIOD (${currentRun.periodMonth}/${currentRun.periodYear}):
- Total Gross: ${currentRun.totalGross} ${currentRun.currency}
- Total Net: ${currentRun.totalNet} ${currentRun.currency}
- Total Deductions: ${currentRun.totalDeductions} ${currentRun.currency}
- Employee Count: ${currentRun.employeeCount}
- Sample items (${Math.min(currentSummary.length, 10)} of ${currentSummary.length}):
${JSON.stringify(currentSummary.slice(0, 10), null, 2)}

${prevRun ? `PREVIOUS PERIOD (${prevRun.periodMonth}/${prevRun.periodYear}):
- Total Gross: ${prevRun.totalGross} ${prevRun.currency}
- Total Net: ${prevRun.totalNet} ${prevRun.currency}
- Employee Count: ${prevRun.employeeCount}
- Sample items: ${JSON.stringify(prevSummary.slice(0, 5), null, 2)}` : 'No previous period available for comparison.'}

Identify:
1. Any suspicious outliers (unusually high/low pay)
2. Significant changes vs previous period (>20% variation)
3. Missing deductions or zero-tax employees
4. Any other payroll anomalies

Format your response as a JSON array of anomaly objects: { severity: "HIGH"|"MEDIUM"|"LOW", category: string, description: string, recommendation: string }`

  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      maxOutputTokens: 1000,
      temperature: 0.2,
    })

    // Parse AI response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const anomalies = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    // Log audit
    await prisma.aiAuditLog.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        userRole: profile.role,
        page: 'ANOMALY_DETECTOR',
        query: `Run ${runId} anomaly check`,
        wasAnswered: true,
        wasBlocked: false,
      },
    })

    return NextResponse.json({
      anomalies,
      runSummary: {
        period: `${currentRun.periodMonth}/${currentRun.periodYear}`,
        totalGross: currentRun.totalGross,
        totalNet: currentRun.totalNet,
        employeeCount: currentRun.employeeCount,
        currency: currentRun.currency,
      },
    })
  } catch (err) {
    console.error('[AI Anomaly Error]', err)
    return NextResponse.json({ error: 'Anomaly detection failed' }, { status: 500 })
  }
}
