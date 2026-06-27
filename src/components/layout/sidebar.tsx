'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  ChevronDown,
  Sparkles,
  User,
  DollarSign,
  GitBranch,
  Building2,
  Layers,
  Network,
  Umbrella,
  Briefcase,
  Shield,
  UserCog,
  Flag,
  BookOpen,
  Paperclip,
  Phone,
  HeartPulse,
  MapPin,
  Package,
  GraduationCap,
  BookMarked,
  Award,
  Target,
  Lightbulb,
  BookText,
  BadgeCheck,
  MinusCircle,
  PlusCircle,
  Clock,
  Receipt,
  Banknote,
  UsersRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NavItem {
  readonly label: string
  readonly href: string
  readonly icon: React.ComponentType<{ className?: string }>
  readonly children?: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[]
}

interface SidebarProps {
  readonly organizationName?: string
  readonly userRole?: string
}

export function Sidebar({ organizationName = 'PayrollPro', userRole }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const navItems: NavItem[] = [
    { label: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
    {
      label: t('employees'),
      href: '/employees',
      icon: Users,
      children: [
        { label: t('personalInfo'),      href: '/employees/personal',   icon: User },
        { label: t('financialInfo'),     href: '/employees/financial',  icon: DollarSign },
        { label: t('orgChart'),          href: '/employees/org-chart',  icon: GitBranch },
        { label: t('companyStructure'),  href: '/employees/structure',  icon: Building2 },
      ],
    },
    { label: t('payroll'),   href: '/payroll',   icon: Calculator },
    { label: t('payslips'),           href: '/payslips',                        icon: FileText },
    { label: t('salaryTransactions'), href: '/payroll/salary-transactions',     icon: Receipt },
    { label: t('leave'),     href: '/leave',     icon: CalendarDays },
    { label: t('reports'),   href: '/reports',   icon: BarChart3 },
  ]

  const settingsItems: NavItem[] = [
    { label: t('formulaBuilder'),  href: '/settings/formula-builder', icon: ShieldCheck },
    { label: t('taxTables'),       href: '/settings/tax-tables',      icon: Globe },
    { label: t('salaryComponents'),href: '/settings/salary-components',icon: Calculator },
    { label: t('leaveTypes'),      href: '/settings/leave-types',     icon: Umbrella },
    { label: t('jobTitles'),       href: '/settings/job-titles',      icon: Briefcase },
    {
      label: t('employeeGeneralSetup'),
      href: '/settings/nationalities',
      icon: UsersRound,
      children: [
        { label: t('nationalities'),   href: '/settings/nationalities',   icon: Flag },
        { label: t('religions'),       href: '/settings/religions',       icon: BookOpen },
        { label: t('contactTypes'),    href: '/settings/contact-types',   icon: Phone },
        { label: t('healthStatuses'),  href: '/settings/health-statuses', icon: HeartPulse },
        { label: t('birthPlaces'),     href: '/settings/birth-places',    icon: MapPin },
        { label: t('assetTypes'),      href: '/settings/asset-types',     icon: Package },
        { label: t('attachmentTypes'), href: '/settings/attachment-types',icon: Paperclip },
      ],
    },
    {
      label: t('employeeEducationSetup'),
      href: '/settings/universities',
      icon: GraduationCap,
      children: [
        { label: t('universities'),              href: '/settings/universities',              icon: GraduationCap },
        { label: t('faculties'),                 href: '/settings/faculties',                 icon: BookMarked },
        { label: t('academicDegrees'),           href: '/settings/academic-degrees',          icon: Award },
        { label: t('competencyClassifications'), href: '/settings/competency-classifications',icon: Target },
        { label: t('competencies'),              href: '/settings/competencies',              icon: Lightbulb },
        { label: t('trainingTypes'),             href: '/settings/training-types',            icon: BookText },
        { label: t('certificateTypes'),          href: '/settings/certificate-types',         icon: BadgeCheck },
      ],
    },
    { label: t('deductionTypes'),            href: '/settings/deduction-types',            icon: MinusCircle },
    { label: t('otherIncomeTypes'),          href: '/settings/other-income-types',         icon: PlusCircle },
    { label: t('overtimeTypes'),             href: '/settings/overtime-types',             icon: Clock },
    { label: t('allowanceTypes'),            href: '/settings/allowance-types',            icon: Banknote },
    { label: t('orgLevels'),       href: '/settings/org-levels',      icon: Layers },
    { label: t('orgUnits'),        href: '/settings/org-units',       icon: Network },
    { label: t('branding'),        href: '/settings/branding',        icon: Settings },
    { label: t('systemLogs'),      href: '/settings/logs',            icon: FileText },
  ]

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
        {navItems.map((item) =>
          item.children ? (
            <ExpandableNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              isActive={isActive}
            />
          ) : (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          )
        )}

        {userRole && ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(userRole) && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('settings')}
              </p>
            </div>
            {settingsItems.map((item) =>
              item.children ? (
                <ExpandableNavItem key={item.href} item={item} pathname={pathname} isActive={isActive} />
              ) : (
                <NavLink key={item.href} {...item} active={isActive(item.href)} />
              )
            )}
          </>
        )}

        {userRole && ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(userRole) && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('administrativeSetup')}
              </p>
            </div>
            <NavLink
              href="/settings/branches"
              label={t('branches')}
              icon={GitBranch}
              active={isActive('/settings/branches')}
            />
            <ExpandableNavItem
              item={{
                label: t('manageUsers'),
                href: '/settings/users',
                icon: Users,
                children: [
                  { label: t('userRoleSetup'), href: '/settings/user-groups', icon: Shield },
                  { label: t('usersSetup'),    href: '/settings/users',       icon: UserCog },
                ],
              }}
              pathname={pathname}
              isActive={isActive}
            />
          </>
        )}

        {userRole === 'SUPER_ADMIN' && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('superAdmin')}
              </p>
            </div>
            <NavLink
              href="/admin/tenants"
              label={t('allTenants')}
              icon={ShieldCheck}
              active={isActive('/admin/tenants')}
            />
          </>
        )}
      </nav>

      {/* Self-Service & AI */}
      <div className="px-3 pb-4 border-t border-gray-800 pt-4 space-y-1">
        <NavLink href="/self-service" label={t('selfService')} icon={UserCircle} active={isActive('/self-service')} />
        <NavLink href="/ai" label={t('aiAssistant')} icon={Sparkles} active={isActive('/ai')} />
      </div>
    </aside>
  )
}

function ExpandableNavItem({
  item,
  pathname: _pathname,
  isActive,
}: Readonly<{
  item: NavItem
  pathname: string
  isActive: (href: string) => boolean
}>) {
  const anyChildActive = item.children?.some((c) => isActive(c.href))
  const parentActive = isActive(item.href)
  const defaultOpen = anyChildActive || parentActive

  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      {/* Parent row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group min-h-[44px]',
          parentActive || anyChildActive
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open
          ? <ChevronDown className="w-3 h-3 opacity-60" />
          : <ChevronRight className="w-3 h-3 opacity-60" />
        }
      </button>

      {/* Sub-items */}
      {open && item.children && (
        <div className="mt-1 ml-4 pl-3 border-l border-gray-700 space-y-0.5">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors min-h-[40px]',
                isActive(child.href)
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <child.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: Readonly<{
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}>) {
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
