import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl) throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseKey) throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookieEncoding: 'base64url',
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Use getSession() to read the session from cookies without a network call.
  // This is safe for middleware route protection; sensitive data pages do their
  // own server-side getUser() validation.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const isPublicRoute = request.nextUrl.pathname === '/' || isAuthRoute
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/workspace'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
