import { prisma } from '@/lib/prisma/client'

export interface AllocationSummary {
  totalPct: number
  overAllocated: boolean
  assignments: { projectId: string; projectName: string; allocationPct: number }[]
}

/**
 * Returns the total allocation % for an employee across all concurrent active
 * assignments in the given date range, optionally excluding one assignment (for
 * edit operations).
 *
 * This is used to generate an over-allocation warning — it never hard-blocks.
 */
export async function getEmployeeAllocationSummary(
  employeeId: string,
  organizationId: string,
  fromDate: Date,
  toDate: Date,
  excludeAssignmentId?: string,
): Promise<AllocationSummary> {
  const assignments = await prisma.resourceAssignment.findMany({
    where: {
      employeeId,
      organizationId,
      status: { in: ['APPROVED', 'PENDING'] },
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      // Overlap: assignment starts before toDate AND (ends after fromDate OR has no end)
      startDate: { lte: toDate },
      OR: [
        { endDate: null },
        { endDate: { gte: fromDate } },
      ],
    },
    include: { project: { select: { id: true, name: true } } },
  })

  const totalPct = assignments.reduce(
    (sum, a) => sum + Number(a.allocationPct ?? 0),
    0,
  )

  return {
    totalPct,
    overAllocated: totalPct > 100,
    assignments: assignments.map((a) => ({
      projectId: a.project.id,
      projectName: a.project.name,
      allocationPct: Number(a.allocationPct ?? 0),
    })),
  }
}
