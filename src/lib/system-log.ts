import { prisma } from '@/lib/prisma/client'

/**
 * Write a system activity log entry.
 * Errors are swallowed so a logging failure never breaks the main operation.
 */
export async function logActivity(
  orgId: string,
  actorId: string | null,
  actorEmail: string | null,
  action: string,
  entity?: { type: string; id: string },
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        organizationId: orgId,
        actorId:        actorId  ?? null,
        actorEmail:     actorEmail ?? null,
        action,
        entityType:     entity?.type  ?? null,
        entityId:       entity?.id    ?? null,
        detail:         detail ? (detail as object) : undefined,
      },
    })
  } catch {
    // intentionally silent — logging must never break the main flow
  }
}
