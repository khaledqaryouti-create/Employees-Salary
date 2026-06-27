import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { generateWPSSIF, generateWPSCSV } from '@/lib/export/wps-sif'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile?.organizationId) return error('FORBIDDEN', 'No organization', 403)
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403)
    }

    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')
    const format = searchParams.get('format') ?? 'sif'

    if (!runId) return error('VALIDATION', 'runId parameter is required', 400)

    const run = await prisma.payrollRun.findUnique({
      where: { id: runId, organizationId: profile.organizationId },
      include: { organization: true },
    })

    if (!run) return error('NOT_FOUND', 'Payroll run not found', 404)

    const items = await prisma.payrollItem.findMany({
      where: { payrollRunId: runId, hasError: false },
      include: {
        employee: {
          include: { salaryStructure: true },
        },
      },
    })

    const employees = items.map((item) => {
      const earningsJson = item.earningsJson as Record<string, number>
      const deductionsJson = item.deductionsJson as Record<string, number>
      const totalAllowances = Object.values(earningsJson).reduce((s, v) => s + v, 0)
      const totalDeductions = Object.values(deductionsJson).reduce((s, v) => s + v, 0)

      return {
        employeeNumber: item.employee.employeeNumber,
        fullName: item.employee.fullName,
        iban: '', // In production, fetch from secure bank details store
        basicSalary: item.employee.salaryStructure?.basicSalary ?? 0,
        allowances: totalAllowances,
        deductions: totalDeductions,
        netPay: item.netPay,
        currency: item.employee.salaryStructure?.currency ?? 'SAR',
      }
    })

    const header = {
      employerReference: run.organizationId.substring(0, 20),
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
      totalEmployees: employees.length,
      totalAmount: employees.reduce((s, e) => s + e.netPay, 0),
      currency: run.currency ?? 'SAR',
    }

    if (format === 'csv') {
      const csv = generateWPSCSV(header, employees)
      const filename = `wps-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}.csv`
      logger.info('WPS CSV exported', { runId, orgId: profile.organizationId })
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const sif = generateWPSSIF(header, employees)
    const filename = `wps-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}.sif`
    logger.info('WPS SIF exported', { runId, orgId: profile.organizationId })
    return new Response(sif, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error('GET /api/export/wps failed', { error: err })
    return error('SERVER_ERROR', 'Export failed. Please try again.', 500)
  }
}
