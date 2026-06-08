import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { z } from 'zod'

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(500).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile || !profile.organizationId) return error('FORBIDDEN', 'No organization', 403)

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'MANAGER'].includes(profile.role)) {
      return error('FORBIDDEN', 'You do not have permission to review leave requests', 403)
    }

    const body: unknown = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { select: { organizationId: true } } },
    })

    if (!leaveRequest) return error('NOT_FOUND', 'Leave request not found', 404)
    if (leaveRequest.employee.organizationId !== profile.organizationId) {
      return error('FORBIDDEN', 'Cannot review leave request from another organization', 403)
    }
    if (leaveRequest.status !== 'PENDING') {
      return error('CONFLICT', `Leave request is already ${leaveRequest.status}`, 409)
    }

    // Find approver's employee record
    const approverEmployee = await prisma.employee.findFirst({
      where: { profile: { id: profile.id }, organizationId: profile.organizationId },
      select: { id: true },
    })

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approvedById: approverEmployee?.id ?? null,
        approvedAt: new Date(),
        rejectionReason: parsed.data.action === 'REJECT' ? (parsed.data.notes ?? null) : null,
      },
    })

    logger.info('Leave request reviewed', {
      requestId: id,
      action: parsed.data.action,
      reviewedBy: user.id,
    })

    return success(updated)
  } catch (err) {
    logger.error('PATCH /api/leave/[id] failed', { error: err })
    return handlePrismaError(err)
  }
}
