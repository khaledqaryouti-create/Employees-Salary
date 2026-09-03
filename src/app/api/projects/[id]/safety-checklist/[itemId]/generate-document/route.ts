import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { SafetyDocumentTemplate } from '@/lib/pdf/safety-document-template'
import { prisma } from '@/lib/prisma/client'
import { error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; itemId: string }> }

export async function POST(_req: Request, { params }: Params) {
  try {
    const { orgId }                 = await getProfileOrRedirect()
    const { id: projectId, itemId } = await params

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      include: {
        country:      { select: { name: true } },
        organization: { select: { name: true } },
      },
    })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const item = await prisma.projectSafetyItem.findFirst({
      where: { id: itemId, projectId, organizationId: orgId },
      include: {
        requirement: {
          select: {
            title: true, legalReference: true, requiredDocument: true, description: true,
          },
        },
      },
    })
    if (!item) return error('NOT_FOUND', 'Safety item not found', 404)

    const req = item.requirement
    if (!req.requiredDocument) {
      return error('NO_DOCUMENT', 'This requirement has no document type defined.', 400)
    }

    const element = React.createElement(SafetyDocumentTemplate, {
        requirementTitle:  req.title,
        legalReference:    req.legalReference,
        requiredDocument:  req.requiredDocument,
        description:       req.description ?? '',
        projectName:       project.name,
        projectCode:       project.code,
        projectType:       project.projectType,
        countryName:       project.country?.name ?? null,
        projectStartDate:  project.startDate.toLocaleDateString('en-GB'),
        projectStatus:     project.status,
        organizationName:  project.organization.name,
        generatedDate:     new Date().toLocaleDateString('en-GB'),
        notes:             item.notes,
      }) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)

    const filename = `${req.requiredDocument.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    logger.error('safety-checklist.generate-document', { error: err })
    return handlePrismaError(err)
  }
}
