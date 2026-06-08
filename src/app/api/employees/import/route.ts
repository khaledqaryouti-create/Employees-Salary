import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import * as XLSX from 'xlsx'

const REQUIRED_COLS = ['employeeNumber', 'fullName', 'email', 'country', 'employmentType', 'joinDate', 'basicSalary', 'currency']

export async function GET() {
  const wb = XLSX.utils.book_new()
  const headers = [
    'employeeNumber', 'fullName', 'email', 'phone', 'nationality',
    'country', 'department', 'jobTitle', 'employmentType', 'joinDate',
    'basicSalary', 'currency',
  ]
  const sample = [
    'EMP-001', 'Ahmed Al-Rashidi', 'ahmed@company.com', '+966501234567', 'Saudi',
    'SA', 'Finance', 'Accountant', 'LOCAL', '2024-01-15',
    '8000', 'SAR',
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, sample])
  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  const rawBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer
  return new Response(rawBuf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee-import-template.xlsx"',
    },
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile || !profile.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'Insufficient permissions to import employees', 403)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return error('VALIDATION', 'No file uploaded', 400)

    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0] ?? '']
    if (!ws) return error('VALIDATION', 'Could not read worksheet', 400)

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)
    if (rows.length === 0) return error('VALIDATION', 'File is empty', 400)
    if (rows.length > 500) return error('VALIDATION', 'Maximum 500 rows per import', 400)

    // Validate required columns
    const firstRow = rows[0]
    if (firstRow) {
      const missing = REQUIRED_COLS.filter((c) => !(c in firstRow))
      if (missing.length > 0) {
        return error('VALIDATION', `Missing required columns: ${missing.join(', ')}`, 400)
      }
    }

    let created = 0, updated = 0, failed = 0
    const errors: Array<{ row: number; message: string }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const rowNum = i + 2

      try {
        const employeeNumber = String(row['employeeNumber'] ?? '').trim()
        const fullName = String(row['fullName'] ?? '').trim()
        const email = String(row['email'] ?? '').trim()
        const country = String(row['country'] ?? '').trim().toUpperCase()
        const employmentType = String(row['employmentType'] ?? 'LOCAL').trim().toUpperCase()
        const joinDate = new Date(String(row['joinDate'] ?? ''))
        const basicSalary = parseFloat(String(row['basicSalary'] ?? '0'))
        const currency = String(row['currency'] ?? 'USD').trim().toUpperCase()

        if (!employeeNumber || !fullName || !email || !country) {
          errors.push({ row: rowNum, message: 'Missing required fields (employeeNumber, fullName, email, country)' })
          failed++
          continue
        }

        if (isNaN(joinDate.getTime())) {
          errors.push({ row: rowNum, message: `Invalid join date: "${row['joinDate']}"` })
          failed++
          continue
        }

        if (isNaN(basicSalary) || basicSalary < 0) {
          errors.push({ row: rowNum, message: `Invalid basic salary: "${row['basicSalary']}"` })
          failed++
          continue
        }

        const validTypes = ['LOCAL', 'EXPATRIATE', 'CONTRACT', 'PART_TIME']
        if (!validTypes.includes(employmentType)) {
          errors.push({ row: rowNum, message: `Invalid employment type: "${employmentType}". Must be one of: ${validTypes.join(', ')}` })
          failed++
          continue
        }

        const existing = await prisma.employee.findFirst({
          where: { organizationId: profile.organizationId, employeeNumber },
        })

        if (existing) {
          await prisma.employee.update({
            where: { id: existing.id },
            data: {
              fullName,
              email,
              country,
              employmentType: employmentType as 'LOCAL' | 'EXPATRIATE' | 'CONTRACT' | 'PART_TIME',
              joinDate,
              phone: row['phone'] ? String(row['phone']) : undefined,
              nationality: row['nationality'] ? String(row['nationality']) : undefined,
              department: row['department'] ? String(row['department']) : undefined,
              jobTitle: row['jobTitle'] ? String(row['jobTitle']) : undefined,
              salaryStructure: {
                upsert: {
                  create: { basicSalary, currency },
                  update: { basicSalary, currency },
                },
              },
            },
          })
          updated++
        } else {
          await prisma.employee.create({
            data: {
              organizationId: profile.organizationId,
              employeeNumber,
              fullName,
              email,
              country,
              employmentType: employmentType as 'LOCAL' | 'EXPATRIATE' | 'CONTRACT' | 'PART_TIME',
              joinDate,
              phone: row['phone'] ? String(row['phone']) : undefined,
              nationality: row['nationality'] ? String(row['nationality']) : undefined,
              department: row['department'] ? String(row['department']) : undefined,
              jobTitle: row['jobTitle'] ? String(row['jobTitle']) : undefined,
              salaryStructure: {
                create: { basicSalary, currency },
              },
            },
          })
          created++
        }
      } catch (rowErr) {
        const msg = rowErr instanceof Error ? rowErr.message : 'Unknown error'
        errors.push({ row: rowNum, message: msg })
        failed++
      }
    }

    logger.info('Employee import completed', {
      orgId: profile.organizationId,
      created,
      updated,
      failed,
      userId: user.id,
    })

    return success({ created, updated, failed, errors: errors.slice(0, 50) })
  } catch (err) {
    logger.error('POST /api/employees/import failed', { error: err })
    return error('SERVER_ERROR', 'Import failed. Please check your file and try again.', 500)
  }
}
