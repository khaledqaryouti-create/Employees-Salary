'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { ACTIVE_BRANCH_COOKIE } from '@/lib/auth/get-profile'

type CookieStore = Awaited<ReturnType<typeof cookies>>

type BranchProfile = {
  branchId: string | null
  role: string
  organizationId: string | null
}

async function activateBranchForUser(
  cookieStore: CookieStore,
  userId: string,
  profile: BranchProfile,
  selectedBranchId: string,
): Promise<boolean> {
  const targetBranchId = selectedBranchId || profile.branchId || null
  if (!targetBranchId || !profile.organizationId) return false

  const branch = await prisma.branch.findFirst({
    where: { id: targetBranchId, organizationId: profile.organizationId, isActive: true },
    select: { id: true },
  })
  if (!branch) return false

  cookieStore.set(ACTIVE_BRANCH_COOKIE, branch.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  if (branch.id !== profile.branchId) {
    await prisma.profile.update({ where: { id: userId }, data: { branchId: branch.id } })
  }
  return true
}

export async function loginAction(formData: FormData) {
  const email          = formData.get('email') as string
  const password       = formData.get('password') as string
  const branchId       = (formData.get('branchId') as string | null) ?? ''
  const organizationId = (formData.get('organizationId') as string | null)?.trim() || null

  if (!email || !password) {
    return { error: 'Please enter your email and password.' }
  }

  if (!organizationId) {
    return { error: 'Please select a company before signing in.' }
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieEncoding: 'base64url',
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet, _headers) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const msg = error.message.toLowerCase().includes('invalid')
      ? 'Incorrect email or password. Please try again.'
      : error.message
    return { error: msg }
  }

  const userId = authData.user?.id
  if (userId) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { branchId: true, role: true, organizationId: true },
    })

    // Cross-org guard: SUPER_ADMINs have no org and can access any tenant;
    // all other roles must belong to the selected organization.
    const bypassRoles = new Set(['SUPER_ADMIN', 'TENANT_ADMIN'])
    const isSuperAdmin = profile?.role === 'SUPER_ADMIN'
    if (!isSuperAdmin && profile?.organizationId && profile.organizationId !== organizationId) {
      return { error: 'The selected company does not match your account. Please try again.' }
    }

    const needsBranchSelection = profile && !bypassRoles.has(profile.role) && profile.organizationId
    if (needsBranchSelection) {
      const activated = await activateBranchForUser(cookieStore, userId, profile, branchId)
      if (!activated) redirect('/auth/select-branch')
    }
  }

  redirect('/workspace')
}
