import { ZodError } from 'zod'

// Prisma error shape — matches PrismaClientKnownRequestError
interface PrismaKnownError {
  code: string
  meta?: Record<string, unknown>
}

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as Record<string, unknown>)['code'] === 'string'
  )
}

export type ApiSuccess<T> = { ok: true; data: T }
export type ApiError = { ok: false; code: string; message: string; field?: string; details?: unknown }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export function success<T>(data: T): Response {
  return Response.json({ ok: true, data } satisfies ApiSuccess<T>)
}

export function error(
  code: string,
  message: string,
  status = 500,
  field?: string
): Response {
  return Response.json({ ok: false, code, message, field } satisfies ApiError, { status })
}

export function handlePrismaError(err: unknown): Response {
  if (isPrismaKnownError(err)) {
    switch (err.code) {
      case 'P2002':
        return error('DUPLICATE', 'A record with this value already exists.', 409)
      case 'P2003':
        return error('REFERENCED', 'Cannot delete — this record is used by other data.', 409)
      case 'P2025':
        return error('NOT_FOUND', 'The record you are looking for no longer exists.', 404)
      default:
        return error('DB_ERROR', 'A database error occurred. Please try again.', 500)
    }
  }
  if (err instanceof ZodError) {
    // Zod v4: use .issues
    const firstIssue = err.issues[0]
    return error(
      'VALIDATION',
      firstIssue?.message ?? 'Invalid input.',
      400,
      firstIssue?.path.join('.')
    )
  }
  return error('SERVER_ERROR', 'An unexpected error occurred. Please try again.', 500)
}

export class FormulaTimeoutError extends Error {
  constructor() { super('Formula evaluation exceeded 100ms timeout') }
}

export class FormulaSyntaxError extends Error {
  position?: number
  constructor(message: string, position?: number) {
    super(message)
    this.position = position
  }
}
