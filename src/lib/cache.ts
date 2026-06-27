import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma/client'

// ── Cache tags ──────────────────────────────────────────────────────────────
export const CACHE_TAGS = {
  formulaRules: (orgId: string) => `formula-rules-${orgId}`,
  ruleSet: (id: string) => `rule-set-${id}`,
  taxBrackets: (orgId: string) => `tax-brackets-${orgId}`,
  employees: (orgId: string) => `employees-${orgId}`,
  orgConfig: (orgId: string) => `org-config-${orgId}`,
} as const

// ── Cached fetchers ─────────────────────────────────────────────────────────

/**
 * Fetches all payroll rules for an org, cached for 5 minutes.
 * Revalidated whenever formula rules are updated (via revalidateTag).
 */
export const getCachedFormulaRules = (orgId: string) =>
  unstable_cache(
    async () => {
      return prisma.countryRuleSet.findMany({
        where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
        include: { rules: { where: { isActive: true }, orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      })
    },
    [`formula-rules-${orgId}`],
    { revalidate: 300, tags: [CACHE_TAGS.formulaRules(orgId)] },
  )()

/**
 * Fetches a single rule set with its rules, cached for 5 minutes.
 */
export const getCachedRuleSet = (ruleSetId: string) =>
  unstable_cache(
    async () => {
      return prisma.countryRuleSet.findUnique({
        where: { id: ruleSetId },
        include: { rules: { orderBy: { order: 'asc' } } },
      })
    },
    [`rule-set-${ruleSetId}`],
    { revalidate: 300, tags: [CACHE_TAGS.ruleSet(ruleSetId)] },
  )()

/**
 * Fetches tax brackets for an org, cached for 10 minutes.
 */
export const getCachedTaxBrackets = (orgId: string, country?: string) =>
  unstable_cache(
    async () => {
      return prisma.taxBracket.findMany({
        where: {
          organizationId: orgId,
          ...(country && { country }),
        },
        orderBy: [{ country: 'asc' }, { fromAmount: 'asc' }],
      })
    },
    [`tax-brackets-${orgId}-${country ?? 'all'}`],
    { revalidate: 600, tags: [CACHE_TAGS.taxBrackets(orgId)] },
  )()

/**
 * Fetches org configuration values, cached for 10 minutes.
 */
export const getCachedOrgConfig = (orgId: string) =>
  unstable_cache(
    async () => {
      const configs = await prisma.configValue.findMany({
        where: { organizationId: orgId },
      })
      return Object.fromEntries(configs.map((c) => [c.key, c.value]))
    },
    [`org-config-${orgId}`],
    { revalidate: 600, tags: [CACHE_TAGS.orgConfig(orgId)] },
  )()
