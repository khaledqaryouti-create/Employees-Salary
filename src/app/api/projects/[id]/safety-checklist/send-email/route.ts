import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { sendEmail } from '@/lib/email/sender'
import { SafetyChecklistReport } from '@/lib/pdf/safety-checklist-report'
import type { ChecklistItemData } from '@/lib/pdf/safety-checklist-report'

const bodySchema = z.object({
  emails: z.array(z.string().email()).min(1, 'At least one valid email is required'),
})

interface Params { params: Promise<{ id: string }> }

function buildEmailHtml(projectName: string, orgName: string, mandatoryComplete: number, mandatoryTotal: number): string {
  const pct = mandatoryTotal > 0 ? Math.round((mandatoryComplete / mandatoryTotal) * 100) : 0
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Safety Checklist — ${projectName}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
  <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #1e40af; padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px;">Safety Checklist Review</h1>
      <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px;">${projectName}</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; margin-top: 0;">
        Please find attached the current safety checklist for project <strong>${projectName}</strong>.
      </p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          Mandatory progress: <strong>${mandatoryComplete} / ${mandatoryTotal} complete (${pct}%)</strong>
        </p>
      </div>
      <p style="color: #374151;">
        Please review the checklist and ensure all items are actioned before project activation.
        Update the status of any items that have been completed or are in progress.
      </p>
      <p style="background: #fefce8; border: 1px solid #fde047; border-radius: 6px; padding: 12px; color: #713f12; font-size: 13px;">
        <strong>Note:</strong> This checklist is a compliance aid only. It does not constitute legal
        certification. All mandatory items must be verified by a qualified professional (RSPP / CSP-CSE /
        fire-safety specialist as applicable).
      </p>
      <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">— ${orgName}</p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">This message was sent by your project management system. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId }         = await getProfileOrRedirect()
    const { id: projectId } = await params

    const body   = await request.json() as unknown
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }
    const { emails } = parsed.data

    const project = await prisma.project.findFirst({
      where:   { id: projectId, organizationId: orgId },
      include: {
        country:      { select: { name: true } },
        organization: { select: { name: true } },
      },
    })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const items = await prisma.projectSafetyItem.findMany({
      where:   { projectId, organizationId: orgId },
      include: {
        requirement: {
          select: {
            title: true, legalReference: true, description: true,
            category: true, mandatory: true, recurring: true,
            requiredRole: true, requiredDocument: true,
          },
        },
        assignedTo: { select: { fullName: true } },
      },
      orderBy: [
        { requirement: { category: 'asc' } },
        { requirement: { sortOrder: 'asc' } },
      ],
    })

    const mandatoryTotal    = items.filter((i) => i.requirement.mandatory).length
    const mandatoryComplete = items.filter((i) => i.requirement.mandatory && i.status === 'DONE').length

    const checklistItems: ChecklistItemData[] = items.map((i) => ({
      id:         i.id,
      status:     i.status,
      dueDate:    i.dueDate ? i.dueDate.toISOString() : null,
      notes:      i.notes,
      assignedTo: i.assignedTo,
      requirement: {
        title:            i.requirement.title,
        legalReference:   i.requirement.legalReference,
        category:         i.requirement.category,
        mandatory:        i.requirement.mandatory,
        recurring:        i.requirement.recurring,
        requiredRole:     i.requirement.requiredRole,
        requiredDocument: i.requirement.requiredDocument,
        description:      i.requirement.description,
      },
    }))

    const pdfElement = React.createElement(SafetyChecklistReport, {
      projectName:       project.name,
      projectCode:       project.code,
      projectStatus:     project.status,
      countryName:       project.country?.name ?? null,
      organizationName:  project.organization.name,
      generatedDate:     new Date().toLocaleDateString('en-GB'),
      mandatoryTotal,
      mandatoryComplete,
      items:             checklistItems,
    }) as React.ReactElement<DocumentProps>

    const pdfBuffer = await renderToBuffer(pdfElement)
    const filename  = `safety-checklist-${project.code.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
    const htmlBody  = buildEmailHtml(project.name, project.organization.name, mandatoryComplete, mandatoryTotal)
    const subject   = `Safety Checklist — ${project.name} (${project.code})`

    let sent = 0
    for (const to of emails) {
      const ok = await sendEmail({
        to,
        subject,
        html:        htmlBody,
        attachments: [{ filename, content: new Uint8Array(pdfBuffer) }],
      })
      if (ok) sent++
    }

    if (sent === 0) {
      return error('EMAIL_FAILED', 'Failed to send emails. Please check your email configuration.', 500)
    }

    return success({ sent, total: emails.length })
  } catch (err) {
    logger.error('safety-checklist.send-email', { error: err })
    return handlePrismaError(err)
  }
}
