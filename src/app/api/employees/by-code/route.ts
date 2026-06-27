import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(req.url)
    const code = (searchParams.get('code') ?? '').trim()

    if (!code) {
      return NextResponse.json({ error: 'Employee code is required' }, { status: 400 })
    }

    const employee = await prisma.employee.findFirst({
      where: {
        organizationId: orgId,
        employeeNumber: { equals: code, mode: 'insensitive' },
        isActive: true,
      },
      select: {
        id:             true,
        employeeNumber: true,
        fullName:       true,
        jobTitle:       true,
        orgUnit:        { select: { name: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: employee })
  } catch (e) {
    console.error('[GET /api/employees/by-code]', e)
    return NextResponse.json({ error: 'Failed to find employee' }, { status: 500 })
  }
}
