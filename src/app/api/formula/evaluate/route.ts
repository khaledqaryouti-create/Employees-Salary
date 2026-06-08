import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { evaluateFormula, validateFormula } from '@/lib/formula-engine/evaluator'
import { success, error } from '@/lib/errors/api-response'
import { z } from 'zod'

const schema = z.object({
  formula: z.string().min(1, 'Formula is required'),
  context: z.record(z.string(), z.union([z.number(), z.string()])).default({}),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile?.role ?? '')) {
    return error('FORBIDDEN', 'Insufficient permissions', 403)
  }

  const body: unknown = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }

  const { formula, context } = parsed.data

  // First validate syntax
  const syntaxError = validateFormula(formula)
  if (syntaxError) {
    return success({ valid: false, error: syntaxError.message, result: null })
  }

  // Build numeric context (filter out non-numeric)
  const numericContext: Record<string, number> = {}
  for (const [k, v] of Object.entries(context)) {
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    if (!isNaN(n)) numericContext[k] = n
  }

  const result = evaluateFormula(
    formula,
    { basicSalary: 0, yearsOfService: 0, ...numericContext },
    profile?.organizationId ?? undefined
  )

  if (!result.ok) {
    return success({ valid: false, error: result.message, result: null })
  }

  return success({ valid: true, result: result.value, error: null })
}
