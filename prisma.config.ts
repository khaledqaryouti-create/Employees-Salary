import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

const databaseUrl = process.env['DATABASE_URL']
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Copy .env.example to .env.local and fill in your Supabase connection string.',
  )
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: { url: databaseUrl },
})
