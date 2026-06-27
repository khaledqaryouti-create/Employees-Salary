import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { generateGLJournalEntries, generateGLJournalCSV } from '@/lib/export/gl-journal'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile?.organizationId) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  const allowedRoles = ['ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN']
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const runId = searchParams.get('runId')
  if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 })

  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId: profile.organizationId },
  })
  if (!run) return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })

  const entries = generateGLJournalEntries({
    id: run.id,
    periodMonth: run.periodMonth,
    periodYear: run.periodYear,
    currency: run.currency,
    totalGross: run.totalGross,
    totalNet: run.totalNet,
    totalDeductions: run.totalDeductions,
    totalEmployerCost: 0, // Calculated separately from employer cost items
    employeeCount: run.employeeCount,
  })

  const csv = generateGLJournalCSV(entries, run.currency)
  const filename = `gl-journal-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
