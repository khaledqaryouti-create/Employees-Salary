import { prisma } from '@/lib/prisma/client'

interface TaxBracket {
  fromAmount: number
  toAmount: number | null
  rate: number
  fixedAmount: number
}

/**
 * Calculates progressive tax from stored tax brackets.
 */
export function calculateProgressiveTax(
  annualIncome: number,
  brackets: TaxBracket[]
): number {
  if (!brackets.length || annualIncome <= 0) return 0

  const sorted = [...brackets].sort((a, b) => a.fromAmount - b.fromAmount)
  let tax = 0
  let remaining = annualIncome

  for (const bracket of sorted) {
    if (remaining <= 0) break
    if (annualIncome < bracket.fromAmount) break

    const upper = bracket.toAmount ?? Infinity
    const lower = bracket.fromAmount
    const taxableInBracket = Math.min(remaining, upper - lower)

    if (taxableInBracket > 0) {
      tax += taxableInBracket * (bracket.rate / 100) + bracket.fixedAmount
      remaining -= taxableInBracket
    }
  }

  return Math.round(tax * 100) / 100
}

/**
 * Fetches brackets from DB and calculates the annual tax, returned as monthly.
 */
export async function monthlyTaxFromBrackets(
  annualIncome: number,
  orgId: string,
  country: string,
  year: number
): Promise<number> {
  const brackets = await prisma.taxBracket.findMany({
    where: { organizationId: orgId, country, year },
    orderBy: { fromAmount: 'asc' },
  })

  if (!brackets.length) return 0

  const annualTax = calculateProgressiveTax(annualIncome, brackets)
  return Math.round((annualTax / 12) * 100) / 100
}
