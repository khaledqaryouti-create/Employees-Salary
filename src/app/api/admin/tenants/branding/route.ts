import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).optional(),
  displayName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  country: z.string().optional(),
  address: z.string().optional(),
  primaryColor: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  payrollCycle: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY']).optional(),
})

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || !profile.organizationId) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  const allowedRoles = ['ORG_ADMIN', 'SUPER_ADMIN']
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, country, primaryColor, currency, payrollCycle } = parsed.data

  const updated = await prisma.organization.update({
    where: { id: profile.organizationId },
    data: {
      ...(name && { name }),
      ...(country && { country }),
      ...(currency && { currency }),
      ...(payrollCycle && { payFrequency: payrollCycle }),
    },
  })

  if (primaryColor) {
    await prisma.tenantBranding.upsert({
      where: { organizationId: profile.organizationId },
      update: { primaryColor },
      create: { organizationId: profile.organizationId, primaryColor },
    })
  }

  return NextResponse.json({ organization: updated })
}
