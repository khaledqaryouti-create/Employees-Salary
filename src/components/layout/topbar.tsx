'use client'

import { useState, useTransition } from 'react'
import { Menu, Bell, LogOut, User, Sparkles, Languages, Check, Building2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { setLocale } from '@/app/actions/set-locale'
import { locales, localeLabels, type Locale } from '@/i18n/locales'

interface BranchOption {
  readonly id: string
  readonly name: string
  readonly code?: string | null
  readonly isHeadQuarter?: boolean
}

interface TopbarProps {
  readonly userEmail?: string
  readonly userName?: string
  readonly userRole?: string
  readonly organizationName?: string
  readonly orgLocale?: Locale
  readonly unreadNotifications?: number
  readonly branchName?: string | null
  readonly activeBranchId?: string | null
  readonly canSwitchBranch?: boolean
  readonly availableBranches?: readonly BranchOption[]
}

function LanguageToggle({ orgLocale }: { readonly orgLocale: Locale }) {
  const currentLocale = useLocale() as Locale
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Primary locales: English + tenant's language (always shown at top)
  const primaryLocales: Locale[] = orgLocale === 'en'
    ? ['en']
    : ['en', orgLocale]

  // Remaining locales below a separator
  const otherLocales = (locales as readonly Locale[]).filter(
    l => !primaryLocales.includes(l)
  )

  function handleSelect(locale: Locale) {
    startTransition(async () => {
      await setLocale(locale)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 h-9 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors disabled:opacity-50"
        disabled={isPending}
      >
        <Languages className="w-4 h-4" />
        <span className="hidden sm:inline text-xs font-medium uppercase">
          {currentLocale}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Language</p>
        </div>
        {primaryLocales.map(locale => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSelect(locale)}
            className="flex items-center justify-between gap-2"
          >
            <span>{localeLabels[locale]}</span>
            {currentLocale === locale && <Check className="w-3.5 h-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {otherLocales.map(locale => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSelect(locale)}
            className="flex items-center justify-between gap-2"
          >
            <span>{localeLabels[locale]}</span>
            {currentLocale === locale && <Check className="w-3.5 h-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface BranchSwitcherProps {
  readonly branchName: string
  readonly activeBranchId: string
  readonly availableBranches: readonly BranchOption[]
}

function BranchSwitcher({ branchName, activeBranchId, availableBranches }: BranchSwitcherProps) {
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)

  async function handleSwitch(branchId: string) {
    if (branchId === activeBranchId) return
    setIsSwitching(true)
    try {
      const res = await fetch('/api/auth/set-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId }),
      })
      if (!res.ok) {
        toast.error('Failed to switch branch. Please try again.')
        return
      }
      router.refresh()
    } catch {
      toast.error('Failed to switch branch. Please try again.')
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 max-w-[180px]"
        disabled={isSwitching}
        aria-label="Switch branch"
      >
        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate text-xs font-medium">{branchName}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Branch</p>
        </div>
        {availableBranches.map(branch => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => handleSwitch(branch.id)}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate text-sm">{branch.name}</span>
              {branch.isHeadQuarter && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">HQ</span>
              )}
            </div>
            {branch.id === activeBranchId && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar({
  userEmail,
  userName,
  userRole,
  organizationName,
  orgLocale = 'en',
  unreadNotifications = 0,
  branchName,
  activeBranchId,
  canSwitchBranch = false,
  availableBranches = [],
}: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
      router.refresh()
    } catch {
      toast.error('Failed to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? 'U'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger
          className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar organizationName={organizationName} userRole={userRole} />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:block" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* AI Mode button */}
        <Link
          href="/ai"
          className="hidden sm:flex items-center gap-2 text-purple-600 border border-purple-200 hover:bg-purple-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Mode</span>
        </Link>

        {/* Branch switcher — shown when branch is assigned */}
        {branchName && activeBranchId && canSwitchBranch && availableBranches.length > 1 ? (
          <BranchSwitcher
            branchName={branchName}
            activeBranchId={activeBranchId}
            availableBranches={availableBranches}
          />
        ) : branchName ? (
          <div className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-xs text-blue-700 bg-blue-50 border border-blue-200 max-w-[180px]">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate font-medium">{branchName}</span>
          </div>
        ) : null}

        {/* Language toggle */}
        <LanguageToggle orgLocale={orgLocale} />

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative min-w-[44px] min-h-[44px]"
          onClick={() => toast.info('Notifications coming soon')}
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-red-500">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 h-9 px-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="User menu"
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
              {userName ?? userEmail}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {userRole?.replaceAll('_', ' ')}
              </Badge>
              {branchName && (
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{branchName}</span>
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/self-service')}>
              <User className="w-4 h-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
