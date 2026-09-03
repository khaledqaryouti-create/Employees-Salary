/**
 * Safety checklist generator — pure matching logic.
 * Given a project's attributes and the full set of active requirements for the project's country,
 * returns the subset of requirements that apply to this project.
 *
 * Rule matching:
 *  1. The requirement's projectTypes array must include the project's projectType.
 *  2. ELECTRICAL_SAFETY category or triggerCondition containing "hasElectricalWorks":
 *     also requires project.hasElectricalWorks = true.
 *  3. triggerCondition containing "hasMultipleContractors":
 *     also requires project.hasMultipleContractors = true.
 *  4. triggerCondition containing "scaffolding present":
 *     treated as optional (not filtered out — always included so the team can mark N/A).
 *  5. Trigger conditions referring to completion events ("at project completion", "before works start")
 *     are always included so they appear in the checklist and can be managed by status.
 */

import { prisma } from '@/lib/prisma/client'
import type { ProjectType, SafetyRequirement } from '@prisma/client'

interface ProjectAttributes {
  projectType:           ProjectType | null
  countryId:             string | null
  hasElectricalWorks:    boolean
  hasMultipleContractors: boolean
}

/**
 * How many days before the project start date each safety category must be completed.
 * Used to auto-populate due dates when the checklist is first generated.
 */
const CATEGORY_LEAD_DAYS: Record<string, number> = {
  GENERAL_OHS:       30,
  CONSTRUCTION_SITE: 60,
  FIRE_SAFETY:       45,
  ELECTRICAL_SAFETY: 30,
  SPECIALIZED_RISK:  45,
  ENVIRONMENTAL:     30,
}

function computeDueDate(startDate: Date | null, category: string): Date | null {
  if (!startDate) return null
  const leadDays = CATEGORY_LEAD_DAYS[category] ?? 30
  return new Date(startDate.getTime() - leadDays * 86_400_000)
}

export function matchesProject(req: SafetyRequirement, project: ProjectAttributes): boolean {
  if (!project.projectType) return false
  if (!project.countryId)   return false

  if (!req.projectTypes.includes(project.projectType)) return false

  const trigger = req.triggerCondition ?? ''

  if (req.category === 'ELECTRICAL_SAFETY' || trigger.includes('hasElectricalWorks')) {
    if (!project.hasElectricalWorks) return false
  }

  if (trigger.includes('hasMultipleContractors')) {
    if (!project.hasMultipleContractors) return false
  }

  return true
}

/**
 * Loads all active requirements for the project's country and returns the matching ones.
 * Returns an empty array if the project has no countryId or projectType set.
 */
export async function getMatchingRequirements(project: ProjectAttributes): Promise<SafetyRequirement[]> {
  if (!project.countryId || !project.projectType) return []

  const all = await prisma.safetyRequirement.findMany({
    where: { countryId: project.countryId, active: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })

  return all.filter((req) => matchesProject(req, project))
}

type ExistingItem = { id: string; requirementId: string; status: string; dueDate: Date | null; assignedToEmployeeId: string | null }

async function upsertExistingItem(
  item:      ExistingItem,
  category:  string,
  startDate: Date | null,
  managerId: string | null,
): Promise<boolean> {
  const needsBackfill = !item.dueDate && !item.assignedToEmployeeId
  if (item.status === 'NOT_APPLICABLE') {
    const dueDate = needsBackfill ? computeDueDate(startDate, category) : undefined
    await prisma.projectSafetyItem.update({
      where: { id: item.id },
      data: {
        status: 'NOT_STARTED',
        ...(needsBackfill && { dueDate, assignedToEmployeeId: managerId ?? null }),
      },
    })
    return true
  }
  if (needsBackfill && (startDate ?? managerId)) {
    await prisma.projectSafetyItem.update({
      where: { id: item.id },
      data: {
        dueDate:              computeDueDate(startDate, category),
        assignedToEmployeeId: managerId ?? null,
      },
    })
    return true
  }
  return false
}

/**
 * Upserts ProjectSafetyItem rows for a project based on the current matching requirements.
 * Items for requirements that no longer match are set to NOT_APPLICABLE (preserves history).
 * Idempotent — safe to call multiple times.
 *
 * When creating NEW items (or backfilling existing items that have no dueDate/assignee):
 *  - dueDate is auto-set based on project startDate and the category's lead time.
 *  - assignedToEmployeeId is set to the project manager (managerId) if provided.
 * Items that already have a dueDate or assignee are left unchanged (preserves manual edits).
 */
export async function generateChecklist(
  projectId:      string,
  organizationId: string,
  branchId:       string | null,
  project:        ProjectAttributes,
  startDate:      Date | null = null,
  managerId:      string | null = null,
): Promise<{ created: number; updated: number; deactivated: number }> {
  // Validate managerId so a stale/deleted employee FK never crashes creation
  let safeManagerId: string | null = null
  if (managerId) {
    const manager = await prisma.employee.findFirst({
      where:  { id: managerId, organizationId },
      select: { id: true },
    })
    safeManagerId = manager?.id ?? null
  }

  const matchingReqs = await getMatchingRequirements(project)
  const matchingIds  = new Set(matchingReqs.map((r) => r.id))

  const existing = await prisma.projectSafetyItem.findMany({
    where: { projectId },
    select: { id: true, requirementId: true, status: true, dueDate: true, assignedToEmployeeId: true },
  })

  const existingByReqId = new Map(existing.map((e) => [e.requirementId, e]))

  let created     = 0
  let updated     = 0
  let deactivated = 0

  for (const req of matchingReqs) {
    const existingItem = existingByReqId.get(req.id)
    if (existingItem) {
      const wasUpdated = await upsertExistingItem(existingItem, req.category, startDate, safeManagerId)
      if (wasUpdated) updated++
    } else {
      const dueDate = computeDueDate(startDate, req.category)
      await prisma.projectSafetyItem.create({
        data: {
          projectId,
          organizationId,
          branchId,
          requirementId:        req.id,
          dueDate,
          assignedToEmployeeId: safeManagerId,
        },
      })
      created++
    }
  }

  for (const item of existing) {
    if (!matchingIds.has(item.requirementId) && item.status !== 'NOT_APPLICABLE') {
      await prisma.projectSafetyItem.update({
        where: { id: item.id },
        data:  { status: 'NOT_APPLICABLE' },
      })
      deactivated++
    }
  }

  return { created, updated, deactivated }
}
