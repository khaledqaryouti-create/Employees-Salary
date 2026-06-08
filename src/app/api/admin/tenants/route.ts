import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { z } from 'zod'

const createTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  country: z.string().nullable().optional(),
  adminEmail: z.string().email('Invalid admin email'),
  adminName: z.string().min(2, 'Admin name required'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (profile?.role !== 'SUPER_ADMIN') return error('FORBIDDEN', 'Super Admin only', 403)

    const orgs = await prisma.organization.findMany({
      include: { _count: { select: { employees: true, payrollRuns: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return success(orgs)
  } catch (err) {
    logger.error('GET /api/admin/tenants failed', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (profile?.role !== 'SUPER_ADMIN') return error('FORBIDDEN', 'Super Admin only', 403)

    const body: unknown = await request.json()
    const parsed = createTenantSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { name, slug, country, adminEmail, adminName } = parsed.data

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) return error('CONFLICT', `Slug "${slug}" is already taken`, 409)

    // Create organization
    const org = await prisma.organization.create({
      data: { name, slug, country: country ?? undefined, isActive: true },
    })

    // Invite the admin user via Supabase Auth
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(adminEmail, {
      data: { full_name: adminName, organization_id: org.id, role: 'TENANT_ADMIN' },
    })

    if (inviteError) {
      // Rollback org if invite fails
      await prisma.organization.delete({ where: { id: org.id } })
      logger.error('Admin invite failed', { adminEmail, error: inviteError })
      return error('INVITE_FAILED', `Could not invite admin: ${inviteError.message}`, 500)
    }

    logger.info('Tenant created', { orgId: org.id, slug, adminEmail, createdBy: user.id })
    return success(org)
  } catch (err) {
    logger.error('POST /api/admin/tenants failed', { error: err })
    return handlePrismaError(err)
  }
}
