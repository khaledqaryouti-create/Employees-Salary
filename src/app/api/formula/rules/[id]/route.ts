import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  formula: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile?.role ?? '')) {
      return error('FORBIDDEN', 'Insufficient permissions', 403)
    }

    const body: unknown = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const rule = await prisma.payrollRule.update({
      where: { id },
      data: parsed.data,
    })

    logger.info('Formula rule updated', { ruleId: rule.id, orgId: profile?.organizationId ?? undefined })
    return success(rule)
  } catch (err) {
    logger.error('PATCH /api/formula/rules/[id] failed', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile?.role ?? '')) {
      return error('FORBIDDEN', 'Insufficient permissions', 403)
    }

    await prisma.payrollRule.delete({ where: { id } })
    logger.info('Formula rule deleted', { ruleId: id, orgId: profile?.organizationId ?? undefined })
    return success({ deleted: true })
  } catch (err) {
    logger.error('DELETE /api/formula/rules/[id] failed', { error: err })
    return handlePrismaError(err)
  }
}
