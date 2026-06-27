'use client'

import { useState } from 'react'
import { Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface WorkspaceHeaderProps {
  readonly userName?: string | null
  readonly userEmail: string
  readonly userRole: string
  readonly organizationName?: string | null
}

export default function WorkspaceHeader({
  userName,
  userEmail,
  userRole,
  organizationName,
}: WorkspaceHeaderProps) {
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
    : userEmail[0]?.toUpperCase() ?? 'U'

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100/80 flex items-center justify-between px-6 shrink-0">
      {/* Logo / org name */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white text-xs font-bold">
            {organizationName?.[0]?.toUpperCase() ?? 'H'}
          </span>
        </div>
        <span className="font-semibold text-gray-900 hidden sm:block truncate max-w-[200px]">
          {organizationName ?? 'HR System'}
        </span>
      </div>

      {/* Right: notifications + user menu */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative min-w-[44px] min-h-[44px]"
          onClick={() => toast.info('Notifications coming soon')}
        >
          <Bell className="w-5 h-5" />
          <span className="sr-only">Notifications</span>
        </Button>

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
              <p className="text-sm font-medium truncate">{userName ?? userEmail}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {userRole.replaceAll('_', ' ')}
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
