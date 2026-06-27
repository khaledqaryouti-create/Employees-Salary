import { create, all, type FactoryFunctionMap } from 'mathjs'
import { logger } from '@/lib/errors/logger'

const math = create(all as FactoryFunctionMap)


export interface FormulaContext {
  basicSalary: number
  grossSalary?: number
  yearsOfService: number
  monthsOfService?: number
  age?: number
  daysInMonth?: number
  workedDays?: number
  unpaidLeaveDays?: number
  employmentType?: string
  [key: string]: number | string | undefined
}

export interface FormulaResult {
  ok: true
  value: number
}

export interface FormulaError {
  ok: false
  code: string
  message: string
  position?: number
}

export type EvaluationResult = FormulaResult | FormulaError

/**
 * Safely evaluates a formula string with the given context variables.
 * Never throws â€” always returns a typed result.
 */
export function evaluateFormula(
  formula: string,
  context: FormulaContext,
  orgId?: string
): EvaluationResult {
  if (!formula.trim()) {
    return { ok: true, value: 0 }
  }

  const startTime = Date.now()

  try {
    // Build a clean scope with only the context variables
    const scope: Record<string, number | string> = {}

    for (const [key, val] of Object.entries(context)) {
      if (val !== undefined) {
        scope[key] = val
      }
    }

    // Add helper functions
    scope['max'] = Math.max as unknown as number
    scope['min'] = Math.min as unknown as number
    scope['abs'] = Math.abs as unknown as number
    scope['round'] = Math.round as unknown as number
    scope['floor'] = Math.floor as unknown as number
    scope['ceil'] = Math.ceil as unknown as number

    const result = math.evaluate(formula, scope)
    const elapsed = Date.now() - startTime

    if (elapsed > 100) {
      logger.warn('Formula evaluation slow', { formula, elapsed, orgId })
    }

    const numericResult = typeof result === 'number' ? result : Number(result)

    if (!Number.isFinite(numericResult)) {
      logger.warn('Formula returned non-finite value (division by zero?)', { formula, orgId })
      return { ok: true, value: 0 }
    }

    return { ok: true, value: Math.round(numericResult * 100) / 100 }
  } catch (err) {
    const elapsed = Date.now() - startTime

    if (elapsed >= 100) {
      logger.error('Formula timeout', { formula, elapsed, orgId })
      return { ok: false, code: 'TIMEOUT', message: 'Formula took too long to evaluate (>100ms).' }
    }

    const message = err instanceof Error ? err.message : 'Unknown formula error'
    logger.error('Formula syntax error', { formula, message, orgId })

    return {
      ok: false,
      code: 'SYNTAX',
      message: `Formula error: ${message}`,
    }
  }
}

/**
 * Validates a formula without evaluating it against real data.
 * Used in the Formula Builder live preview.
 */
export function validateFormula(formula: string): FormulaError | null {
  if (!formula.trim()) return null

  try {
    math.parse(formula)
    return null
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid formula syntax'
    return { ok: false, code: 'SYNTAX', message }
  }
}
