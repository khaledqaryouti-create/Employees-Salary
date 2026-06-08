import { describe, it, expect } from 'vitest'
import { evaluateFormula, validateFormula } from '@/lib/formula-engine/evaluator'
import { calculateProgressiveTax } from '@/lib/formula-engine/tax-bracket-lookup'

describe('Formula Engine', () => {
  describe('evaluateFormula', () => {
    it('evaluates basic arithmetic', () => {
      const result = evaluateFormula('basicSalary * 0.10', { basicSalary: 10000, yearsOfService: 0 })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(1000)
    })

    it('evaluates with max() function', () => {
      const result = evaluateFormula('max(basicSalary * 0.05, 200)', { basicSalary: 3000, yearsOfService: 0 })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(200)
    })

    it('evaluates with min() function', () => {
      const result = evaluateFormula('min(basicSalary, 15000) * 0.12', { basicSalary: 8000, yearsOfService: 0 })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(960)
    })

    it('handles division by zero gracefully', () => {
      const result = evaluateFormula('basicSalary / 0', { basicSalary: 1000, yearsOfService: 0 })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(0) // Returns 0 for Infinity
    })

    it('handles empty formula', () => {
      const result = evaluateFormula('', { basicSalary: 1000, yearsOfService: 0 })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(0)
    })

    it('returns error for invalid formula', () => {
      const result = evaluateFormula('basicSalary *** 0.10', { basicSalary: 1000, yearsOfService: 0 })
      expect(result.ok).toBe(false)
    })

    it('evaluates ternary-style with conditionals', () => {
      // grossSalary <= 21000 → ESIC applies
      const result = evaluateFormula(
        'grossSalary <= 21000 ? grossSalary * 0.0075 : 0',
        { basicSalary: 15000, yearsOfService: 0, grossSalary: 18000 }
      )
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(135)
    })

    it('handles round()', () => {
      const result = evaluateFormula('round(basicSalary * 0.115)', { basicSalary: 8000, yearsOfService: 0 })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(920)
    })
  })

  describe('validateFormula', () => {
    it('returns null for valid formula', () => {
      expect(validateFormula('basicSalary * 0.10')).toBeNull()
    })

    it('returns error for invalid syntax', () => {
      const err = validateFormula('basicSalary **+ 0.10')
      expect(err).not.toBeNull()
      expect(err?.ok).toBe(false)
    })

    it('returns null for empty formula', () => {
      expect(validateFormula('')).toBeNull()
    })
  })
})

describe('Progressive Tax Calculator', () => {
  // Note: calculateProgressiveTax uses fromAmount/toAmount with rate as percentage (5 = 5%)
  it('calculates tax for first bracket', () => {
    const brackets = [
      { fromAmount: 0, toAmount: 300000, rate: 5, fixedAmount: 0 },
      { fromAmount: 300000, toAmount: 700000, rate: 10, fixedAmount: 0 },
      { fromAmount: 700000, toAmount: null, rate: 15, fixedAmount: 0 },
    ]
    const tax = calculateProgressiveTax(150000, brackets)
    expect(tax).toBe(7500) // 150,000 * 5%
  })

  it('calculates tax spanning multiple brackets', () => {
    const brackets = [
      { fromAmount: 0, toAmount: 300000, rate: 5, fixedAmount: 0 },
      { fromAmount: 300000, toAmount: 700000, rate: 10, fixedAmount: 0 },
      { fromAmount: 700000, toAmount: null, rate: 15, fixedAmount: 0 },
    ]
    const tax = calculateProgressiveTax(500000, brackets)
    // 300,000 * 5% = 15,000
    // 200,000 * 10% = 20,000
    // Total = 35,000
    expect(tax).toBe(35000)
  })

  it('returns 0 for zero income', () => {
    const brackets = [{ fromAmount: 0, toAmount: null, rate: 23, fixedAmount: 0 }]
    expect(calculateProgressiveTax(0, brackets)).toBe(0)
  })
})
