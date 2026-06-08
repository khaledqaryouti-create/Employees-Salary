import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rate limiting is applied inline in each API route via lib/rate-limit.ts
// to keep the middleware Edge-compatible without importing Upstash conditionally.

const PUBLIC_PATHS = ['/auth/', '/api/auth/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public auth paths
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
