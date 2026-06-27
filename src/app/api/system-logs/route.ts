import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

export async function GET(req: NextRequest) {
  const { profile, orgId } = await getProfileOrRedirect()

  if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'))
  const limit  = Math.min(100, Number.parseInt(searchParams.get('limit') ?? '50'))
  const action = searchParams.get('action') ?? ''

  const where = {
    organizationId: orgId,
    ...(action ? { action } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.systemLog.count({ where }),
  ])

  return NextResponse.json({ ok: true, data: logs, total, page, limit })
}
