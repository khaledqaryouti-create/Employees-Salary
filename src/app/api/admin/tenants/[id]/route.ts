import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { z } from 'zod'

const updateSchema = z.object({
  name:         z.string().min(2).optional(),
  country:      z.string().optional(),
  currency:     z.string().optional(),
  payFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY']).optional(),
  isActive:     z.boolean().optional(),
  primaryColor: z.string().optional(),
})

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (profile?.role !== 'SUPER_ADMIN') return null
  return profile
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = await requireSuperAdmin()
    if (!admin) return error('FORBIDDEN', 'Super Admin only', 403)

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        branding: true,
        _count: { select: { employees: true, payrollRuns: true, users: true } },
      },
    })

    if (!organization) return error('NOT_FOUND', 'Organization not found', 404)
    return success({ organization })
  } catch (e) {
    console.error('[GET /api/admin/tenants/[id]]', e)
    return error('INTERNAL_SERVER_ERROR', 'Failed to fetch tenant', 500)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = await requireSuperAdmin()
    if (!admin) return error('FORBIDDEN', 'Super Admin only', 403)

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid data', 400)
    }

    const { primaryColor, ...orgFields } = parsed.data

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...orgFields,
        ...(primaryColor !== undefined && {
          branding: {
            upsert: {
              create: { primaryColor },
              update: { primaryColor },
            },
          },
        }),
      },
    })

    return success({ organization })
  } catch (e) {
    console.error('[PATCH /api/admin/tenants/[id]]', e)
    return error('INTERNAL_SERVER_ERROR', 'Failed to update tenant', 500)
  }
}
