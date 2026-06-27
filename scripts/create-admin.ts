/**
 * Creates a Super Admin user in Supabase Auth + the corresponding Profile record.
 *
 * Usage:
 *   pnpm tsx scripts/create-admin.ts \
 *     --email admin@yourcompany.com \
 *     --password "YourPassword123!" \
 *     --name "Your Full Name"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in .env.local
 */

import { config } from 'dotenv'
import { resolve } from 'node:path'
// Load .env then .env.local (local overrides)
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2)
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}

const email    = getArg('--email')    ?? 'admin@payrollpro.demo'
const password = getArg('--password') ?? 'Admin@PayrollPro2026!'
const fullName = getArg('--name')     ?? 'Super Admin'

// ── Validate env ────────────────────────────────────────────────────────────
const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey     = process.env.SUPABASE_SERVICE_ROLE_KEY
const databaseUrl        = process.env.DATABASE_URL

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error('    → Get your service_role key from: Supabase Dashboard > Settings > API')
  process.exit(1)
}

if (!databaseUrl) {
  console.error('❌  Missing DATABASE_URL in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma  = new PrismaClient({ adapter })

async function main() {
  console.log(`\n👤 Creating Super Admin: ${email}`)

  // ── 1. Create Supabase Auth user ──────────────────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // skip email confirmation
    user_metadata: { fullName, role: 'SUPER_ADMIN' },
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('ℹ️  Auth user already exists — fetching existing user')
      const { data: list } = await supabase.auth.admin.listUsers()
      const existing = list?.users?.find((u) => u.email === email)
      if (!existing) {
        console.error('❌  Could not find existing user')
        process.exit(1)
      }
      authData!.user = existing as unknown as NonNullable<typeof authData>['user']
    } else {
      console.error('❌  Auth user creation failed:', authError.message)
      process.exit(1)
    }
  }

  const userId = authData!.user!.id
  console.log(`✅  Auth user created/found: ${userId}`)

  // ── 2. Upsert Profile record ──────────────────────────────────────────────
  await prisma.profile.upsert({
    where: { id: userId },
    update: { fullName, email, role: 'SUPER_ADMIN', isActive: true },
    create: { id: userId, fullName, email, role: 'SUPER_ADMIN', isActive: true },
  })
  console.log('✅  Profile record upserted')

  console.log('\n🎉 Done! You can now log in with:')
  console.log(`   Email:    ${email}`)
  console.log(`   Password: ${password}`)
  console.log('\n   URL: http://localhost:8080/auth/login\n')
}

main()
  .catch((e) => { console.error('❌ Script failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
