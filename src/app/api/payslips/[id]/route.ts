import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { renderToBuffer } from '@react-pdf/renderer'
import { PayslipDocument } from '@/lib/pdf/payslip-template'
import React from 'react'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile) return error('FORBIDDEN', 'Profile not found', 403)

    // Load payroll item with all relations
    const item = await prisma.payrollItem.findUnique({
      where: { id },
      include: {
        employee: {
          include: { salaryStructure: true, profile: { select: { id: true } } },
        },
        payrollRun: {
          include: { organization: true },
        },
      },
    })

    if (!item) return error('NOT_FOUND', 'Payslip not found', 404)

    // Security: employee can only view own payslips; HR can view all in org
    const isOwnPayslip = item.employee.profile?.id === profile.id
    const isHr = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN', 'MANAGER'].includes(profile.role)
    const sameOrg = item.payrollRun.organizationId === profile.organizationId

    if (!isOwnPayslip && !(isHr && sameOrg)) {
      return error('FORBIDDEN', 'You do not have permission to view this payslip', 403)
    }

    const currency = item.employee.salaryStructure?.currency ?? 'USD'
    const earningsJson = item.earningsJson as Record<string, number>
    const deductionsJson = item.deductionsJson as Record<string, number>

    const payslipData = {
      organizationName: item.payrollRun.organization.name,
      periodMonth: item.payrollRun.periodMonth,
      periodYear: item.payrollRun.periodYear,
      employeeName: item.employee.fullName,
      employeeNumber: item.employee.employeeNumber,
      jobTitle: item.employee.jobTitle,
      department: item.employee.department,
      country: item.employee.country,
      currency,
      basicSalary: item.employee.salaryStructure?.basicSalary ?? 0,
      earnings: earningsJson,
      deductions: deductionsJson,
      grossPay: item.grossPay,
      totalDeductions: item.totalDeductions,
      netPay: item.netPay,
      generatedAt: new Date(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payslipElement = React.createElement(PayslipDocument as any, { data: payslipData })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(payslipElement as any)

    const filename = `payslip-${item.employee.employeeNumber}-${item.payrollRun.periodYear}-${String(item.payrollRun.periodMonth).padStart(2, '0')}.pdf`

    logger.info('Payslip generated', {
      itemId: id,
      employeeId: item.employeeId,
      requestedBy: user.id,
    })

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    logger.error('GET /api/payslips/[id] failed', { error: err })
    return error('SERVER_ERROR', 'Failed to generate payslip. Please try again.', 500)
  }
}
