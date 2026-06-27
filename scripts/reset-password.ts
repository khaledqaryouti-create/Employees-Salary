import { config } from 'dotenv'
import { resolve } from 'node:path'
config({ path: resolve(process.cwd(), '.env'), override: false })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const email    = process.argv[3] ?? 'khaledqaryouti@gmail.com'
const password = process.argv[5] ?? 'Admin@2026!'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

async function run() {
  // Find user by email
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) { console.error('Failed to list users:', listErr.message); process.exit(1) }

  const user = list?.users?.find((u) => u.email === email)
  if (!user) {
    console.error(`No auth user found for ${email}. Run pnpm create-admin first.`)
    process.exit(1)
  }

  console.log(`Found user: ${user.id} (${user.email})`)

  // Update password
  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })
  if (updateErr) { console.error('Failed to update password:', updateErr.message); process.exit(1) }
  console.log('✅ Password updated')

  // Ensure Profile record exists
  await prisma.profile.upsert({
    where: { id: user.id },
    update: { email, role: 'SUPER_ADMIN', isActive: true },
    create: { id: user.id, email, fullName: 'Khaled Alqaryouti', role: 'SUPER_ADMIN', isActive: true },
  })
  console.log('✅ Profile record confirmed')

  console.log(`\n🎉 Ready to log in:`)
  console.log(`   Email:    ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   URL:      http://localhost:8080/auth/login\n`)
  process.exit(0)
}

run()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
