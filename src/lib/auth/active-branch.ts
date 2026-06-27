import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma/client'
import { ACTIVE_BRANCH_COOKIE } from './get-profile'

/**
 * Reads the active branch cookie and validates it belongs to the given org.
 * Returns the branchId string if valid, or null if no branch is active / cookie is invalid.
 */
export async function getActiveBranchId(organizationId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const branchId = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value
  if (!branchId) return null

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId, isActive: true },
    select: { id: true },
  })
  return branch?.id ?? null
}
