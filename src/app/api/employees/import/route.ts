import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import * as XLSX from 'xlsx'

const REQUIRED_COLS = ['employeeNumber', 'fullName', 'email', 'country', 'employmentType', 'joinDate', 'basicSalary', 'currency']

const VALID_EMPLOYMENT_TYPES = ['LOCAL', 'EXPATRIATE', 'CONTRACT', 'PART_TIME'] as const
type EmploymentType = typeof VALID_EMPLOYMENT_TYPES[number]

type ValidatedRow = {
  employeeNumber: string; fullName: string; email: string; country: string
  employmentType: EmploymentType; joinDate: Date; basicSalary: number; currency: string
  phone?: string; nationality?: string; jobTitle?: string
}
type RowValidationResult = { ok: true; data: ValidatedRow } | { ok: false; message: string }
type ImportError = { row: number; message: string }
type ImportResult = { created: number; updated: number; failed: number; errors: ImportError[] }

function validateImportRow(row: Record<string, string>, rowNum: number): RowValidationResult {
  const employeeNumber = String(row['employeeNumber'] ?? '').trim()
  const fullName       = String(row['fullName']       ?? '').trim()
  const email          = String(row['email']          ?? '').trim()
  const country        = String(row['country']        ?? '').trim().toUpperCase()
  const employmentType = String(row['employmentType'] ?? 'LOCAL').trim().toUpperCase()
  const joinDate       = new Date(String(row['joinDate'] ?? ''))
  const basicSalary    = Number.parseFloat(String(row['basicSalary'] ?? '0'))
  const currency       = String(row['currency']       ?? 'USD').trim().toUpperCase()

  if (!employeeNumber || !fullName || !email || !country) {
    return { ok: false, message: `Row ${rowNum}: Missing required fields (employeeNumber, fullName, email, country)` }
  }
  if (Number.isNaN(joinDate.getTime())) {
    return { ok: false, message: `Row ${rowNum}: Invalid join date: "${row['joinDate']}"` }
  }
  if (Number.isNaN(basicSalary) || basicSalary < 0) {
    return { ok: false, message: `Row ${rowNum}: Invalid basic salary: "${row['basicSalary']}"` }
  }
  if (!VALID_EMPLOYMENT_TYPES.includes(employmentType as EmploymentType)) {
    return { ok: false, message: `Row ${rowNum}: Invalid employment type: "${employmentType}". Must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}` }
  }

  return {
    ok: true,
    data: {
      employeeNumber, fullName, email, country,
      employmentType: employmentType as EmploymentType,
      joinDate, basicSalary, currency,
      phone:       row['phone']       ? String(row['phone'])       : undefined,
      nationality: row['nationality'] ? String(row['nationality']) : undefined,
      jobTitle:    row['jobTitle']    ? String(row['jobTitle'])    : undefined,
    },
  }
}

async function upsertImportedEmployee(orgId: string, data: ValidatedRow): Promise<'created' | 'updated'> {
  const existing = await prisma.employee.findFirst({
    where: { organizationId: orgId, employeeNumber: data.employeeNumber },
  })
  const { basicSalary, currency, employeeNumber, ...fields } = data

  if (existing) {
    await prisma.employee.update({
      where: { id: existing.id },
      data: { ...fields, salaryStructure: { upsert: { create: { basicSalary, currency }, update: { basicSalary, currency } } } },
    })
    return 'updated'
  }

  await prisma.employee.create({
    data: { ...fields, employeeNumber, organizationId: orgId, salaryStructure: { create: { basicSalary, currency } } },
  })
  return 'created'
}

async function parseFile(file: File): Promise<Record<string, string>[] | null> {
  const arrayBuffer = await file.arrayBuffer()
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0] ?? '']
  if (!ws) return null
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws)
}

function validateColumns(rows: Record<string, string>[]): string | null {
  if (rows.length === 0) return 'File is empty'
  if (rows.length > 500) return 'Maximum 500 rows per import'
  const firstRow = rows[0]
  if (firstRow) {
    const missing = REQUIRED_COLS.filter((c) => !(c in firstRow))
    if (missing.length > 0) return `Missing required columns: ${missing.join(', ')}`
  }
  return null
}

async function processRows(rows: Record<string, string>[], orgId: string): Promise<ImportResult> {
  let created = 0, updated = 0, failed = 0
  const errors: ImportError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const rowNum = i + 2

    try {
      const validation = validateImportRow(row, rowNum)
      if (!validation.ok) {
        errors.push({ row: rowNum, message: validation.message })
        failed++
        continue
      }
      const outcome = await upsertImportedEmployee(orgId, validation.data)
      if (outcome === 'created') created++
      else updated++
    } catch (rowErr) {
      errors.push({ row: rowNum, message: rowErr instanceof Error ? rowErr.message : 'Unknown error' })
      failed++
    }
  }

  return { created, updated, failed, errors: errors.slice(0, 50) }
}

export async function GET() {
  const wb = XLSX.utils.book_new()
  const headers = [
    'employeeNumber', 'fullName', 'email', 'phone', 'nationality',
    'country', 'jobTitle', 'employmentType', 'joinDate',
    'basicSalary', 'currency',
  ]
  const sample = [
    'EMP-001', 'Ahmed Al-Rashidi', 'ahmed@company.com', '+966501234567', 'Saudi',
    'SA', 'Accountant', 'LOCAL', '2024-01-15',
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
    if (!profile?.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'Insufficient permissions to import employees', 403)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return error('VALIDATION', 'No file uploaded', 400)

    const rows = await parseFile(file)
    if (!rows) return error('VALIDATION', 'Could not read worksheet', 400)

    const colError = validateColumns(rows)
    if (colError) return error('VALIDATION', colError, 400)

    const result = await processRows(rows, profile.organizationId)

    logger.info('Employee import completed', {
      orgId: profile.organizationId,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      userId: user.id,
    })

    return success(result)
  } catch (err) {
    logger.error('POST /api/employees/import failed', { error: err })
    return error('SERVER_ERROR', 'Import failed. Please check your file and try again.', 500)
  }
}
