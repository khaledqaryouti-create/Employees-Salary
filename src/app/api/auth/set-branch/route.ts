import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { ACTIVE_BRANCH_COOKIE } from '@/lib/auth/get-profile'

const schema = z.object({ branchId: z.string().min(1) })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { organizationId: true, role: true },
    })
    if (!profile?.organizationId) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 })
    }

    const body = await request.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { branchId } = parsed.data

    // Validate the branch belongs to the user's org
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: profile.organizationId, isActive: true },
      select: { id: true, name: true },
    })
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found or inactive' }, { status: 404 })
    }

    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_BRANCH_COOKIE, branch.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({ branchId: branch.id, branchName: branch.name })
  } catch (err) {
    console.error('[set-branch]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
