import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  name:             z.string().min(2).optional(),
  displayName:      z.string().nullable().optional(),
  contactEmail:     z.union([z.string().email(), z.literal('')]).nullable().optional(),
  website:          z.union([z.string().url(), z.literal('')]).nullable().optional(),
  address:          z.string().nullable().optional(),
  dateFormat:       z.string().optional(),
  country:          z.string().nullable().optional(),
  currency:         z.string().optional(),
  payFrequency:     z.string().optional(),
  primaryColor:     z.string().optional(),
  accentColor:      z.string().optional(),
  companyNameOnSlip: z.string().nullable().optional(),
  payslipFooter:    z.string().nullable().optional(),
  logoUrl:          z.string().nullable().optional(),
})

export async function GET() {
  const { orgId } = await getProfileOrRedirect()

  const [org, branding] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.tenantBranding.findUnique({ where: { organizationId: orgId } }),
  ])

  return NextResponse.json({ org, branding })
}

type BrandingPayload = z.infer<typeof updateSchema>

function buildOrgUpdate(data: BrandingPayload): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  if (data.name         !== undefined) update.name         = data.name
  if (data.displayName  !== undefined) update.displayName  = data.displayName
  if (data.contactEmail !== undefined) update.contactEmail = data.contactEmail || null
  if (data.website      !== undefined) update.website      = data.website || null
  if (data.address      !== undefined) update.address      = data.address
  if (data.dateFormat   !== undefined) update.dateFormat   = data.dateFormat
  if (data.country      !== undefined) update.country      = data.country
  if (data.currency     !== undefined) update.currency     = data.currency
  if (data.payFrequency !== undefined) update.payFrequency = data.payFrequency
  return update
}

export async function PATCH(req: NextRequest) {
  const { orgId } = await getProfileOrRedirect()

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }

  const {
    primaryColor, accentColor, companyNameOnSlip, payslipFooter, logoUrl,
  } = parsed.data

  const orgUpdate = buildOrgUpdate(parsed.data)

  const hasBrandingUpdate = primaryColor !== undefined || accentColor !== undefined ||
    companyNameOnSlip !== undefined || payslipFooter !== undefined || logoUrl !== undefined

  const [updatedOrg] = await Promise.all([
    Object.keys(orgUpdate).length > 0
      ? prisma.organization.update({ where: { id: orgId }, data: orgUpdate })
      : prisma.organization.findUnique({ where: { id: orgId } }),

    hasBrandingUpdate
      ? prisma.tenantBranding.upsert({
          where:  { organizationId: orgId },
          create: {
            organizationId:    orgId,
            primaryColor:      primaryColor     ?? '#2563eb',
            accentColor:       accentColor      ?? '#7c3aed',
            companyNameOnSlip: companyNameOnSlip ?? null,
            payslipFooter:     payslipFooter    ?? null,
            logoUrl:           logoUrl          ?? null,
          },
          update: {
            ...(primaryColor       !== undefined && { primaryColor }),
            ...(accentColor        !== undefined && { accentColor }),
            ...(companyNameOnSlip  !== undefined && { companyNameOnSlip }),
            ...(payslipFooter      !== undefined && { payslipFooter }),
            ...(logoUrl            !== undefined && { logoUrl }),
          },
        })
      : Promise.resolve(null),
  ])

  await logActivity(
    orgId,
    null,
    null,
    'SETTINGS_UPDATED',
    { type: 'Organization', id: orgId },
    { fields: Object.keys(orgUpdate) }
  )

  return NextResponse.json({ ok: true, org: updatedOrg })
}
