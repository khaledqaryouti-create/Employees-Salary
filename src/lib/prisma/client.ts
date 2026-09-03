import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prismaClient: PrismaClient | undefined
}

function buildPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      '[Prisma] DATABASE_URL environment variable is not set. ' +
      'Add it in Vercel → Project Settings → Environment Variables and redeploy.',
    )
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Lazy proxy — DATABASE_URL is only required when a query is actually made,
// so that unit tests importing this module don't fail at module evaluation time.
let _instance: PrismaClient | undefined

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!_instance) {
      _instance = globalThis.prismaClient ?? buildPrismaClient()
      if (process.env.NODE_ENV !== 'production') {
        globalThis.prismaClient = _instance
      }
    }
    return Reflect.get(_instance, prop, _instance)
  },
})
