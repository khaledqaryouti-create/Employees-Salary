import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const createRuleSchema = z.object({
  ruleSetId: z.string().min(1),
  name: z.string().min(1),
  formula: z.string().min(1),
  type: z.enum(['EARNING', 'DEDUCTION', 'EMPLOYER_COST']),
  applicableTo: z.string().default('ALL'),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  order: z.number().int().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile?.role ?? '')) {
      return error('FORBIDDEN', 'Insufficient permissions', 403)
    }

    const body: unknown = await request.json()
    const parsed = createRuleSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    // Get max order to append at end
    const maxOrder = await prisma.payrollRule.aggregate({
      where: { ruleSetId: parsed.data.ruleSetId },
      _max: { order: true },
    })

    const rule = await prisma.payrollRule.create({
      data: {
        ...parsed.data,
        order: parsed.data.order ?? (maxOrder._max.order ?? 0) + 10,
      },
    })

    logger.info('Formula rule created', { ruleId: rule.id, orgId: profile?.organizationId ?? undefined })
    if (profile?.organizationId) {
      await logActivity(profile.organizationId, profile.id, profile.email,
        'RULE_CREATED', { type: 'PayrollRule', id: rule.id }, { name: rule.name, type: rule.type })
    }
    return success(rule)
  } catch (err) {
    logger.error('POST /api/formula/rules failed', { error: err })
    return handlePrismaError(err)
  }
}
