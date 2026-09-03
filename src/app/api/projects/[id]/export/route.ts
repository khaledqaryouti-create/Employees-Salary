import { prisma } from '@/lib/prisma/client'
import { error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { generateProjectExcel } from '@/lib/projects/export-excel'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId }         = await getProfileOrRedirect()
    const { id: projectId } = await params
    const { searchParams }  = new URL(request.url)
    const format            = (searchParams.get('format') ?? 'xlsx') as 'xlsx' | 'pdf'

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      include: {
        costDistributions: {
          include: { employee: { select: { fullName: true } } },
          orderBy: { periodStart: 'asc' },
        },
        budgetLines: { orderBy: { periodStart: 'asc' } },
      },
    })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    if (format === 'xlsx') {
      const buffer = generateProjectExcel({
        projectName: project.name,
        currency:    project.currency,
        costs: project.costDistributions.map((d) => ({
          employeeName:  d.employee.fullName,
          periodStart:   d.periodStart.toISOString(),
          periodEnd:     d.periodEnd.toISOString(),
          allocationPct: d.snapshotAllocationPct ? Number(d.snapshotAllocationPct) : null,
          allocatedCost: Number(d.allocatedCost),
        })),
        budget: project.budgetLines.map((bl) => ({
          category:      bl.category,
          plannedAmount: Number(bl.plannedAmount),
          periodStart:   bl.periodStart.toISOString(),
          periodEnd:     bl.periodEnd.toISOString(),
        })),
      })

      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${project.code}-report.xlsx"`,
        },
      })
    }

    // PDF: return a simple JSON for now — full react-pdf render requires server component
    return error('NOT_IMPLEMENTED', 'PDF export via API requires a server action — use the print dialog for now', 501)
  } catch (err) {
    logger.error('project.export', { error: err })
    return handlePrismaError(err)
  }
}
