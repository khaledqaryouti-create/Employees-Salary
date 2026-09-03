type LogLevel = 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  orgId?: string
  action?: string
  [key: string]: unknown
}

/**
 * Error.message and Error.stack are non-enumerable, so JSON.stringify
 * silently drops them and produces {}.  This helper lifts them into a
 * plain object so every server-side error log is actually readable.
 */
function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    const out: Record<string, unknown> = {
      name:    err.name,
      message: err.message,
      stack:   err.stack,
    }
    if ('code' in err)  out['code']  = (err as { code?: unknown }).code
    if ('meta' in err)  out['meta']  = (err as { meta?: unknown }).meta
    return out
  }
  return err
}

function serializeContext(ctx: LogContext | undefined): Record<string, unknown> {
  if (!ctx) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = k === 'error' ? serializeError(v) : v
  }
  return out
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serializeContext(context),
  }

  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
}
