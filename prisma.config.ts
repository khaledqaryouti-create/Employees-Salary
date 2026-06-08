import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ??
      'postgresql://postgres:kvxTDrvyu8jMPP2a@db.smqnqxcupakpjfvwobla.supabase.co:5432/postgres',
  },
})
