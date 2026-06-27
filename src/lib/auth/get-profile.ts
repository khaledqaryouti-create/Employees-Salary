import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export const ACTIVE_BRANCH_COOKIE = 'active_branch_id'

export async function getProfileOrRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { organization: true, branch: true },
  })
  if (!profile) redirect('/auth/login')

  let orgId = profile.organizationId

  if (!orgId) {
    if (profile.role === 'SUPER_ADMIN') {
      const firstOrg = await prisma.organization.findFirst({ where: { isActive: true } })
      orgId = firstOrg?.id ?? null
    }
    if (!orgId) redirect('/auth/login')
  }

  // Resolve active branch: cookie takes precedence over profile default
  const cookieStore = await cookies()
  const cookieBranchId = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value ?? null

  // Validate cookie branch belongs to this org before trusting it
  let activeBranchId: string | null = null
  let activeBranchName: string | null = null

  if (cookieBranchId) {
    const cookieBranch = await prisma.branch.findFirst({
      where: { id: cookieBranchId, organizationId: orgId as string, isActive: true },
      select: { id: true, name: true },
    })
    if (cookieBranch) {
      activeBranchId = cookieBranch.id
      activeBranchName = cookieBranch.name
    }
  }

  // Fall back to profile's default branch
  if (!activeBranchId && profile.branchId) {
    const defaultBranch = await prisma.branch.findFirst({
      where: { id: profile.branchId, organizationId: orgId as string, isActive: true },
      select: { id: true, name: true },
    })
    if (defaultBranch) {
      activeBranchId = defaultBranch.id
      activeBranchName = defaultBranch.name
    }
  }

  return {
    user,
    profile,
    orgId: orgId as string,
    activeBranchId,
    activeBranchName,
  }
}
