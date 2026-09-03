import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { evaluateReadiness } from '@/lib/dvr/readiness'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES    = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])
const OVERRIDE_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN'])

const DVR_STATUSES = [
  'SETUP', 'DATA_COLLECTION', 'READINESS_REVIEW', 'ASSESSMENT_IN_PROGRESS',
  'CONSULTATION_AND_APPROVAL', 'APPROVED_AND_MONITORED',
] as const

const STATUS_ORDER: Record<string, number> = Object.fromEntries(DVR_STATUSES.map((s, i) => [s, i]))

const updateDvrSchema = z.object({
  documentNumber:        z.string().optional(),
  assessmentScope:       z.string().optional(),
  assessmentDate:        z.string().optional(),
  nextReviewDate:        z.string().optional(),
  reviewFrequencyMonths: z.number().int().min(1).max(60).optional(),
  approvedByName:        z.string().optional(),
  status:                z.enum(DVR_STATUSES).optional(),
  overrideJustification: z.string().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const dvr = await prisma.dvrSetup.findFirst({
      where:   { siteId, organizationId: orgId },
      include: { approvalSignatures: { orderBy: { signedAt: 'asc' } } },
    })
    if (!dvr) return error('NOT_FOUND', 'DVR record not found for this site', 404)

    return success(dvr)
  } catch (err) {
    logger.error('dvr.get', { error: err })
    return handlePrismaError(err)
  }
}

function buildScalarUpdate(parsed: z.infer<typeof updateDvrSchema>) {
  return {
    ...(parsed.documentNumber        !== undefined ? { documentNumber:        parsed.documentNumber }               : {}),
    ...(parsed.assessmentScope       !== undefined ? { assessmentScope:       parsed.assessmentScope }              : {}),
    ...(parsed.assessmentDate        !== undefined ? { assessmentDate:        new Date(parsed.assessmentDate) }     : {}),
    ...(parsed.nextReviewDate        !== undefined ? { nextReviewDate:        new Date(parsed.nextReviewDate) }     : {}),
    ...(parsed.reviewFrequencyMonths !== undefined ? { reviewFrequencyMonths: parsed.reviewFrequencyMonths }        : {}),
    ...(parsed.approvedByName        !== undefined ? { approvedByName:        parsed.approvedByName }               : {}),
  }
}

/**
 * Validates a requested status transition against the readiness gates.
 * Forward jumps of more than one step, or forward moves while a gate has not
 * passed, require documented override permission — users must not manually
 * bypass DVR statuses without authorization and a written justification.
 */
async function validateTransition(
  orgId: string, siteId: string, currentStatus: string, nextStatus: string,
  profileRole: string, overrideJustification: string | undefined
): Promise<{ ok: true } | { ok: false; message: string }> {
  const curIdx  = STATUS_ORDER[currentStatus] ?? 0
  const nextIdx = STATUS_ORDER[nextStatus] ?? 0

  // Moving backward (reopening) is always allowed for admins — no override needed.
  if (nextIdx <= curIdx) return { ok: true }

  const isSingleStepForward = nextIdx === curIdx + 1
  const readiness = await evaluateReadiness(orgId, siteId)
  const gatesRequired = nextIdx >= STATUS_ORDER['ASSESSMENT_IN_PROGRESS']!
  const gatesPass = readiness ? readiness.overallPassed : false

  if (isSingleStepForward && (!gatesRequired || gatesPass)) return { ok: true }

  // Either skipping ahead, or moving forward into/through assessment without gates passing.
  if (!OVERRIDE_ROLES.has(profileRole)) {
    return { ok: false, message: 'This transition requires authorized override permission (Tenant Admin or higher).' }
  }
  if (!overrideJustification || overrideJustification.trim().length < 10) {
    return { ok: false, message: 'A documented justification (min. 10 characters) is required to override the readiness gate.' }
  }
  return { ok: true }
}

/** POST — Start a new review cycle (increments version, resets to READINESS_REVIEW, clears signatures) */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId } = await params

    const existing = await prisma.dvrSetup.findFirst({ where: { siteId, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'DVR record not found for this site', 404)

    // Delete all approval signatures for this DVR
    await prisma.dvrApprovalSignature.deleteMany({ where: { dvrId: existing.id } })

    const dvr = await prisma.dvrSetup.update({
      where: { id: existing.id },
      data: {
        version:  existing.version + 1,
        status:   'READINESS_REVIEW',
        approvedAt:    null,
        approvedByName: null,
        overrideJustification: null,
        overrideById:  null,
        overrideAt:    null,
      },
    })

    logger.info('dvr.new-cycle', { siteId, orgId, userId: profile.id, newVersion: dvr.version })
    void logActivity(orgId, profile.id, profile.email, 'DVR_REVIEW_CYCLE_STARTED',
      { type: 'DVR', id: dvr.id },
      { siteId, newVersion: dvr.version },
    )
    return success(dvr)
  } catch (err) {
    logger.error('dvr.new-cycle.error', { error: err })
    return handlePrismaError(err)
  }
}

function applyOverrideFields(
  data: Record<string, unknown>,
  parsed: z.infer<typeof updateDvrSchema>,
  existing: { status: string },
  profileId: string,
) {
  const wasOverridden = STATUS_ORDER[parsed.status!]! > STATUS_ORDER[existing.status]! + 1 ||
    (STATUS_ORDER[parsed.status!]! === STATUS_ORDER[existing.status]! + 1 && Boolean(parsed.overrideJustification))
  if (wasOverridden && parsed.overrideJustification) {
    data['overrideJustification'] = parsed.overrideJustification
    data['overrideById']          = profileId
    data['overrideAt']            = new Date()
  }
}

async function checkApprovalSignatures(dvrId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const signatures  = await prisma.dvrApprovalSignature.findMany({ where: { dvrId } })
  const sigRoles    = new Set(signatures.map((s) => s.roleType))
  const allPresent  = sigRoles.has('EMPLOYER') && sigRoles.has('RSPP') && (sigRoles.has('RLS') || sigRoles.has('RLST'))
  return allPresent
    ? { ok: true }
    : { ok: false, message: 'All three role signatures (Employer, RSPP, RLS) are required before approving the DVR.' }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId } = await params

    const existing = await prisma.dvrSetup.findFirst({ where: { siteId, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'DVR record not found for this site', 404)

    const body   = await request.json() as unknown
    const parsed = updateDvrSchema.parse(body)

    const data: Record<string, unknown> = buildScalarUpdate(parsed)

    if (parsed.status && parsed.status !== existing.status) {
      const check = await validateTransition(
        orgId, siteId, existing.status, parsed.status, profile.role, parsed.overrideJustification
      )
      if (!check.ok) return error('GATE_BLOCKED', check.message, 409)

      data['status'] = parsed.status
      applyOverrideFields(data, parsed, existing, profile.id)

      if (parsed.status === 'APPROVED_AND_MONITORED') {
        const sigCheck = await checkApprovalSignatures(existing.id)
        if (!sigCheck.ok) return error('SIGNATURES_REQUIRED', sigCheck.message, 409)
        data['approvedAt'] = new Date()
      }
    }

    const dvr = await prisma.dvrSetup.update({ where: { id: existing.id }, data })
    const action = parsed.status && parsed.status !== existing.status ? 'DVR_STATUS_CHANGED' : 'DVR_UPDATED'
    void logActivity(orgId, profile.id, profile.email, action,
      { type: 'DVR', id: dvr.id },
      { siteId, newStatus: dvr.status, previousStatus: existing.status },
    )
    return success(dvr)
  } catch (err) {
    logger.error('dvr.update', { error: err })
    return handlePrismaError(err)
  }
}
