import { config } from 'dotenv'
import { resolve } from 'node:path'
config({ path: resolve(process.cwd(), '.env'), override: false })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

console.log('URL:', url)
console.log('Key (first 20):', key?.slice(0, 20))

const sb = createClient(url, key)

async function run() {
  const { data, error } = await sb.auth.signInWithPassword({
    email: 'khaledqaryouti@gmail.com',
    password: 'Admin@2026!',
  })

  if (error) {
    console.error('AUTH ERROR:', error.message, '| status:', error.status)
  } else {
    console.log('AUTH SUCCESS! User:', data.user?.email, '| ID:', data.user?.id)
  }
  process.exit(0)
}

run()
