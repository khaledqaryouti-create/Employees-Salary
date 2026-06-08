import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Shared Upstash Redis instance (uses env vars UPSTASH_REDIS_REST_URL + TOKEN)
// Falls back gracefully when Redis is not configured (dev / CI)
function makeRatelimiter(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window) })
}

// Strict: 10 req / 10 s — for auth & AI endpoints
export const strictLimiter = makeRatelimiter(10, '10 s')
// Standard: 60 req / 10 s — for general API routes
export const standardLimiter = makeRatelimiter(60, '10 s')

export async function applyRateLimit(
  req: NextRequest,
  limiter: Ratelimit | null,
): Promise<NextResponse | null> {
  if (!limiter) return null // Redis not configured; allow through

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '127.0.0.1'

  const { success, limit, remaining, reset } = await limiter.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    )
  }
  return null
}
