import { prisma } from '@/lib/prisma/client'
import { error } from '@/lib/errors/api-response'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const createSchema = z.object({
  name:        z.string().min(2),
  country:     z.string().min(1),
  year:        z.number().int().min(2020).max(2030),
  description: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403)
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid data', 400)
    }

    const ruleSet = await prisma.countryRuleSet.create({
      data: {
        name: parsed.data.name,
        country: parsed.data.country,
        year: parsed.data.year,
        organizationId: orgId,
        isDefault: false,
        isActive: true,
      },
    })

    return Response.json({ ok: true, data: { ruleSet } }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/formula/rule-sets]', e)
    return error('INTERNAL_SERVER_ERROR', 'Failed to create rule set', 500)
  }
}
