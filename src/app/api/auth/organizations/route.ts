import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { logger } from '@/lib/errors/logger'

export async function GET() {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, displayName: true },
      orderBy: { name: 'asc' },
      take: 500,
    })
    return NextResponse.json(orgs)
  } catch (err) {
    logger.error('auth-organizations-get', { error: err })
    return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 })
  }
}
