'use client'

import { useState } from 'react'
import { Menu, Bell, LogOut, User, Sparkles } from 'lucide-react'
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

interface TopbarProps {
  userEmail?: string
  userName?: string
  userRole?: string
  organizationName?: string
  unreadNotifications?: number
}

export function Topbar({
  userEmail,
  userName,
  userRole,
  organizationName,
  unreadNotifications = 0,
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
                {userRole?.replace('_', ' ')}
              </Badge>
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
