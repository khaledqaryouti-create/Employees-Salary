import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  try {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true },
      orderBy: { name: 'asc' },
      take: 500,
    })
    return NextResponse.json(orgs)
  } catch {
    return NextResponse.json([])
  }
}
