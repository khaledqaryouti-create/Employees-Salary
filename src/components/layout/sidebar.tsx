'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Calculator,
  FileText,
  CalendarDays,
  BarChart3,
  Settings,
  UserCircle,
  ShieldCheck,
  Globe,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Payroll', href: '/payroll', icon: Calculator },
  { label: 'Payslips', href: '/payslips', icon: FileText },
  { label: 'Leave', href: '/leave', icon: CalendarDays },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
]

const settingsItems = [
  { label: 'Formula Builder', href: '/settings/formula-builder', icon: ShieldCheck },
  { label: 'Tax Tables', href: '/settings/tax-tables', icon: Globe },
  { label: 'Salary Components', href: '/settings/salary-components', icon: Calculator },
  { label: 'Branding', href: '/settings/branding', icon: Settings },
  { label: 'System Logs', href: '/settings/logs', icon: FileText },
]

interface SidebarProps {
  organizationName?: string
  userRole?: string
}

export function Sidebar({ organizationName = 'PayrollPro', userRole }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="flex flex-col h-full bg-gray-900 text-white w-64 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{organizationName}</p>
          <p className="text-xs text-gray-400">Payroll System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {userRole && ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(userRole) && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Settings
              </p>
            </div>
            {settingsItems.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </>
        )}

        {userRole === 'SUPER_ADMIN' && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Super Admin
              </p>
            </div>
            <NavLink
              href="/admin/tenants"
              label="All Tenants"
              icon={ShieldCheck}
              active={isActive('/admin/tenants')}
            />
          </>
        )}
      </nav>

      {/* Self-Service & AI */}
      <div className="px-3 pb-4 border-t border-gray-800 pt-4 space-y-1">
        <NavLink href="/self-service" label="Self Service" icon={UserCircle} active={isActive('/self-service')} />
        <NavLink href="/ai" label="AI Assistant" icon={Sparkles} active={isActive('/ai')} />
      </div>
    </aside>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group min-h-[44px]',
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="w-3 h-3 opacity-60" />}
    </Link>
  )
}
