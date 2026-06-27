import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prismaClient: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  const adapter = new PrismaPg({
    connectionString: databaseUrl ?? 'postgresql://localhost:5432/postgres',
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalThis.prismaClient ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalThis.prismaClient = prisma
