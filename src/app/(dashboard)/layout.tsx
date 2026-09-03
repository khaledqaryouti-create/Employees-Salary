import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { countryToLocale } from '@/i18n/locales'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface DashboardLayoutProps {
  readonly children: React.ReactNode
}

interface LayoutData {
  profile: Awaited<ReturnType<typeof getProfileOrRedirect>>['profile']
  activeBranchId: string | null
  activeBranchName: string | null
  availableBranches: { id: string; name: string; code: string | null; isHeadQuarter: boolean }[]
  canSwitchBranch: boolean
}

function isNextInternalSignal(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as Record<string, unknown>)['digest'] === 'string' &&
    (
      String((err as Record<string, unknown>)['digest']).startsWith('NEXT_REDIRECT') ||
      String((err as Record<string, unknown>)['digest']).startsWith('NEXT_NOT_FOUND')
    )
  )
}

async function getLayoutData(): Promise<LayoutData> {
  const { profile, orgId, activeBranchId, activeBranchName } = await getProfileOrRedirect()

  if (!profile) redirect('/auth/login')

  const availableBranches = await prisma.branch.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, code: true, isHeadQuarter: true },
    orderBy: [{ isHeadQuarter: 'desc' }, { name: 'asc' }],
  })

  const switchableRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'MANAGER']
  const canSwitchBranch = switchableRoles.includes(profile.role) && availableBranches.length > 1

  return { profile, activeBranchId, activeBranchName, availableBranches, canSwitchBranch }
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  let data: LayoutData

  try {
    data = await getLayoutData()
  } catch (err: unknown) {
    // Re-throw Next.js redirect/not-found signals — they are intentional control flow
    if (isNextInternalSignal(err)) throw err
    // Any other error (Supabase session failure, Prisma error, etc.) → go to login
    redirect('/auth/login')
  }

  const { profile, activeBranchId, activeBranchName, availableBranches, canSwitchBranch } = data

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          organizationName={profile.organization?.name ?? 'PayrollPro'}
          userRole={profile.role}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          userEmail={profile.email}
          userName={profile.fullName}
          userRole={profile.role}
          organizationName={profile.organization?.name}
          orgLocale={countryToLocale(profile.organization?.country)}
          branchName={activeBranchName}
          activeBranchId={activeBranchId}
          canSwitchBranch={canSwitchBranch}
          availableBranches={availableBranches}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
