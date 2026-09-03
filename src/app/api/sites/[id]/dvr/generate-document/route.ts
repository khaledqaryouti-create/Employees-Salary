import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma/client'
import { error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { DvrReport } from '@/lib/pdf/dvr-report'
import type {
  DvrSafetyRole, DvrWorkerGroup, DvrEquipment, DvrHazardScreening, DvrCorrectiveAction, DvrTrainingRecord, DvrIncident,
} from '@/lib/pdf/dvr-report'

interface Params { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    // Fetch all required data in parallel
    const [site, safetyRoles, workerGroups, equipment, hazardScreenings, org, correctiveActionRows, trainingRows, dvrWithSigs, incidentRows] = await Promise.all([
      prisma.site.findFirst({
        where: { id: siteId, organizationId: orgId },
        include: { dvr: true },
      }),
      prisma.safetyRoleAppointment.findMany({
        where: { siteId, organizationId: orgId, isActive: true },
        include: { employee: { select: { fullName: true } } },
        orderBy: { roleType: 'asc' },
      }),
      prisma.homogeneousWorkerGroup.findMany({
        where: { siteId, organizationId: orgId, isActive: true },
        include: {
          members: {
            include: { employee: { select: { fullName: true, jobTitle: true } } },
          },
        },
        orderBy: { code: 'asc' },
      }),
      prisma.siteEquipment.findMany({
        where: { siteId, organizationId: orgId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.taskHazardScreening.findMany({
        where: {
          isApplicable: true,
          task: { activity: { process: { siteId, organizationId: orgId } } },
        },
        include: {
          task: {
            select: {
              name: true,
              activity: {
                select: {
                  name: true,
                  process: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [
          { task: { activity: { process: { name: 'asc' } } } },
          { task: { name: 'asc' } },
          { hazardCode: 'asc' },
        ],
      }),
      prisma.organization.findUnique({
        where:  { id: orgId },
        select: { name: true },
      }),
      prisma.correctiveAction.findMany({
        where: { siteId, organizationId: orgId },
        include: {
          assignedTo: { select: { fullName: true } },
          hazard:     { select: { hazardCode: true, task: { select: { name: true } } } },
        },
        orderBy: [{ status: 'asc' }, { priority: 'asc' }, { dueDate: 'asc' }],
      }),
      prisma.siteTrainingRecord.findMany({
        where: { siteId, organizationId: orgId },
        include: {
          workerGroup: { select: { name: true, code: true } },
        },
        orderBy: [{ trainingDate: 'asc' }],
      }),
      prisma.dvrSetup.findFirst({
        where:   { siteId, organizationId: orgId },
        include: { approvalSignatures: true },
      }),
      prisma.siteIncident.findMany({
        where: { siteId, organizationId: orgId },
        orderBy: { incidentDate: 'desc' },
      }),
    ])

    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    // Map safety roles
    const mappedRoles: DvrSafetyRole[] = safetyRoles.map((r) => ({
      roleType:     r.roleType,
      employeeName: r.employee?.fullName ?? null,
      externalName: r.externalName,
      expiryDate:   r.expiryDate ? r.expiryDate.toISOString().slice(0, 10) : null,
    }))

    // Map worker groups
    const mappedGroups: DvrWorkerGroup[] = workerGroups.map((g) => ({
      code:        g.code,
      name:        g.name,
      description: g.description,
      members:     g.members.map((m) => ({
        fullName: m.employee.fullName,
        jobTitle: m.employee.jobTitle,
      })),
    }))

    // Map equipment
    const mappedEquipment: DvrEquipment[] = equipment.map((eq) => ({
      name:               eq.name,
      category:           eq.category,
      serialNumber:       eq.serialNumber,
      nextInspectionDate: eq.nextInspectionDate ? eq.nextInspectionDate.toISOString().slice(0, 10) : null,
    }))

    // Map hazard screenings
    const mappedHazards: DvrHazardScreening[] = hazardScreenings.map((h) => ({
      hazardCode:          h.hazardCode,
      justification:       h.justification,
      processName:         h.task.activity.process.name,
      activityName:        h.task.activity.name,
      taskName:            h.task.name,
      probability:         h.probability,
      damage:              h.damage,
      riskLevel:           h.riskLevel,
      riskClass:           h.riskClass,
      mitigationMeasures:  h.mitigationMeasures,
      residualProbability: h.residualProbability,
      residualDamage:      h.residualDamage,
      residualRiskLevel:   h.residualRiskLevel,
      residualRiskClass:   h.residualRiskClass,
    }))

    // Map corrective actions
    const mappedActions: DvrCorrectiveAction[] = correctiveActionRows.map((a) => ({
      id:           a.id,
      title:        a.title,
      description:  a.description,
      priority:     a.priority,
      status:       a.status,
      assigneeName: a.assignedTo?.fullName ?? null,
      dueDate:      a.dueDate ? a.dueDate.toISOString().slice(0, 10) : null,
      hazardCode:   a.hazard?.hazardCode ?? null,
      taskName:     a.hazard?.task?.name ?? null,
    }))

    // Map training records
    const now  = new Date()
    const soon = new Date()
    soon.setDate(soon.getDate() + 60)
    const mappedTraining: DvrTrainingRecord[] = trainingRows.map((r) => {
      let status: string = 'VALID'
      if (r.expiryDate) {
        if (r.expiryDate < now)   status = 'EXPIRED'
        else if (r.expiryDate < soon) status = 'EXPIRING_SOON'
      }
      return {
        id:              r.id,
        trainingType:    r.trainingType,
        trainerName:     r.trainerName,
        trainingDate:    r.trainingDate.toISOString(),
        expiryDate:      r.expiryDate ? r.expiryDate.toISOString() : null,
        certificateRef:  r.certificateRef,
        status,
        workerGroupName: r.workerGroup?.name ?? null,
        workerGroupCode: r.workerGroup?.code ?? null,
      }
    })

    // Map incidents
    const mappedIncidents: DvrIncident[] = incidentRows.map((i) => ({
      id:           i.id,
      incidentType: i.incidentType,
      severity:     i.severity,
      status:       i.status,
      incidentDate: i.incidentDate.toISOString(),
      title:        i.title,
      location:     i.location,
    }))

    const dvr = site.dvr
    const generatedDate = new Date().toISOString().slice(0, 10)

    const element = React.createElement(DvrReport, {
      siteName:         site.name,
      legalEntityName:  site.legalEntityName,
      vatNumber:        site.vatNumber,
      taxCode:          site.taxCode,
      atecoCode:        site.atecoCode,
      atecoDescription: site.atecoDescription,
      address:          site.address,
      city:             site.city,
      siteCountry:      site.country,
      workingHours:     site.workingHours,
      shiftPattern:     site.shiftPattern,
      documentNumber:   dvr?.documentNumber ?? null,
      version:          dvr?.version ?? 1,
      assessmentDate:   dvr?.assessmentDate ? dvr.assessmentDate.toISOString().slice(0, 10) : null,
      nextReviewDate:   dvr?.nextReviewDate  ? dvr.nextReviewDate.toISOString().slice(0, 10)  : null,
      organizationName: org?.name ?? 'Organization',
      safetyRoles:       mappedRoles,
      workerGroups:      mappedGroups,
      equipment:         mappedEquipment,
      hazards:           mappedHazards,
      correctiveActions:  mappedActions,
      trainingRecords:    mappedTraining,
      incidents:          mappedIncidents,
      approvalSignatures: (dvrWithSigs?.approvalSignatures ?? []).map((sig) => ({
        roleType:   sig.roleType,
        signerName: sig.signerName,
        signedAt:   sig.signedAt.toISOString(),
      })),
      generatedDate,
    }) as React.ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)

    const filename = `DVR_${site.name.replace(/\s+/g, '_')}_${generatedDate}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error('sites.dvr.generate-document', { error: err })
    return handlePrismaError(err)
  }
}
