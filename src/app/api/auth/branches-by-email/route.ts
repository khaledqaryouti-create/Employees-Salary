import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const email          = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()
    const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim() || null

    // Return empty list for blank/missing email — no error, avoids enumeration
    if (!email) {
      return NextResponse.json([])
    }

    const profile = await prisma.profile.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { organizationId: true },
    })

    // Prefer the caller-supplied organizationId (company dropdown), fall back to
    // the profile's own org. If neither is available, return empty silently.
    const effectiveOrgId = organizationId ?? profile?.organizationId ?? null
    if (!effectiveOrgId) {
      return NextResponse.json([])
    }

    const branches = await prisma.branch.findMany({
      where: { organizationId: effectiveOrgId, isActive: true },
      select: { id: true, name: true, nameAr: true, code: true, isHeadQuarter: true, city: true },
      orderBy: [{ isHeadQuarter: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json(branches)
  } catch {
    // Swallow errors — return empty list so login form is never blocked
    return NextResponse.json([])
  }
}
