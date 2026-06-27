'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { ACTIVE_BRANCH_COOKIE } from '@/lib/auth/get-profile'

export async function selectBranchAction(branchId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { organizationId: true },
  })
  if (!profile?.organizationId) redirect('/auth/login')

  // Validate the branch belongs to the user's org and is active
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: profile.organizationId, isActive: true },
    select: { id: true },
  })
  if (!branch) redirect('/auth/select-branch')

  // Persist as the user's default branch and set the active cookie
  await prisma.profile.update({
    where: { id: user.id },
    data: { branchId: branch.id },
  })

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_BRANCH_COOKIE, branch.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/workspace')
}
