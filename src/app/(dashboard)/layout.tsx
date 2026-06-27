import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { countryToLocale } from '@/i18n/locales'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface DashboardLayoutProps {
  readonly children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, orgId, activeBranchId, activeBranchName } = await getProfileOrRedirect()

  if (!profile) {
    redirect('/auth/login')
  }

  // Load all active branches so the topbar switcher can show options
  const availableBranches = await prisma.branch.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, code: true, isHeadQuarter: true },
    orderBy: [{ isHeadQuarter: 'desc' }, { name: 'asc' }],
  })

  // Admins and managers can switch branches; employees are locked to their branch
  const switchableRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'MANAGER']
  const canSwitchBranch = switchableRoles.includes(profile.role) && availableBranches.length > 1

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
