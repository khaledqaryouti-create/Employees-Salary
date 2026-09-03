import { prisma } from '@/lib/prisma/client'

export type GateSeverity = 'CRITICAL' | 'MANDATORY' | 'WARNING'

export interface GateItem {
  key:      string
  label:    string
  passed:   boolean
  severity: GateSeverity
  reason?:  string
}

export interface GateResult {
  passed: boolean
  items:  GateItem[]
}

export interface Gate7GroupCoverage {
  groupId:   string
  groupName: string
  groupCode: string
  hasTrained: boolean
}

export interface ReadinessResult {
  gate1: GateResult
  gate2: GateResult
  gate3: GateResult
  gate4: GateResult
  gate5: GateResult
  gate6: GateResult
  gate7: GateResult & { groupCoverage: Gate7GroupCoverage[] }
  overallPassed:    boolean
  criticalBlockers: number
  mandatoryMissing: number
}

const MANDATORY_ROLE_TYPES   = ['EMPLOYER', 'RSPP'] as const
const WORKER_REP_ROLE_TYPES  = ['RLS', 'RLST'] as const

function isRoleActiveAndValid(role: { isActive: boolean; expiryDate: Date | null } | undefined): boolean {
  if (!role) return false
  if (!role.isActive) return false
  if (role.expiryDate && role.expiryDate.getTime() < Date.now()) return false
  return true
}

/** Gate 1 — Company and workplace definition */
async function evaluateGate1(orgId: string, site: {
  legalEntityName: string | null
  vatNumber:       string | null
  atecoCode:       string | null
  address:         string | null
}): Promise<GateResult> {
  const [orgUnitCount, employeeCount] = await Promise.all([
    prisma.orgUnit.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.employee.count({ where: { organizationId: orgId, isActive: true } }),
  ])

  const items: GateItem[] = [
    {
      key: 'legalEntity', label: 'Legal entity / VAT information',
      passed: Boolean(site.legalEntityName && site.vatNumber),
      severity: 'CRITICAL',
      reason: 'Legal entity name and VAT number must be recorded for this site.',
    },
    {
      key: 'ateco', label: 'ATECO code / business activity',
      passed: Boolean(site.atecoCode),
      severity: 'CRITICAL',
      reason: 'ATECO code and business activity classification is missing.',
    },
    {
      key: 'address', label: 'Workplace address',
      passed: Boolean(site.address),
      severity: 'CRITICAL',
      reason: 'No workplace address has been defined for this site.',
    },
    {
      key: 'orgStructure', label: 'Organizational structure',
      passed: orgUnitCount > 0,
      severity: 'CRITICAL',
      reason: 'No departments/organizational units are defined for this organization.',
    },
    {
      key: 'headcount', label: 'Worker headcount',
      passed: employeeCount > 0,
      severity: 'MANDATORY',
      reason: 'No active employees found — the assessment boundary cannot be defined.',
    },
  ]

  return { passed: items.every((i) => i.severity !== 'CRITICAL' || i.passed), items }
}

/** Gate 2 — Safety organization */
async function evaluateGate2(orgId: string, siteId: string): Promise<GateResult> {
  const roles = await prisma.safetyRoleAppointment.findMany({
    where: { siteId, organizationId: orgId },
  })

  const byType = (types: readonly string[]) =>
    roles.find((r) => types.includes(r.roleType) && isRoleActiveAndValid(r))

  const employer   = byType(['EMPLOYER'])
  const rspp       = byType(['RSPP'])
  const workerRep  = byType(WORKER_REP_ROLE_TYPES)
  const medico     = byType(['MEDICO_COMPETENTE'])
  const firstAid   = byType(['FIRST_AID'])
  const fireTeam   = byType(['FIRE_EMERGENCY'])

  const anyExpired = roles.some((r) =>
    MANDATORY_ROLE_TYPES.includes(r.roleType as typeof MANDATORY_ROLE_TYPES[number]) &&
    r.isActive && r.expiryDate && r.expiryDate.getTime() < Date.now()
  )

  const items: GateItem[] = [
    {
      key: 'employer', label: 'Employer appointment (Datore di Lavoro)',
      passed: Boolean(employer), severity: 'CRITICAL',
      reason: 'No active Employer appointment recorded. This duty is non-delegable.',
    },
    {
      key: 'rspp', label: 'RSPP appointment',
      passed: Boolean(rspp), severity: 'CRITICAL',
      reason: anyExpired
        ? 'RSPP appointment has expired and must be renewed.'
        : 'No active RSPP (Responsabile Servizio Prevenzione e Protezione) appointment recorded.',
    },
    {
      key: 'workerRep', label: 'RLS / RLST worker representative',
      passed: Boolean(workerRep), severity: 'MANDATORY',
      reason: 'No active RLS/RLST worker safety representative recorded.',
    },
    {
      key: 'medico', label: 'Occupational physician (Medico Competente)',
      passed: Boolean(medico), severity: 'WARNING',
      reason: 'No occupational physician recorded — confirm whether health surveillance applies.',
    },
    {
      key: 'firstAid', label: 'First-aid personnel',
      passed: Boolean(firstAid), severity: 'MANDATORY',
      reason: 'No designated first-aid personnel recorded.',
    },
    {
      key: 'fireEmergency', label: 'Fire and emergency personnel',
      passed: Boolean(fireTeam), severity: 'MANDATORY',
      reason: 'No designated fire/emergency response personnel recorded.',
    },
  ]

  return { passed: items.every((i) => i.severity !== 'CRITICAL' || i.passed), items }
}

/** Gate 3 — Worker group coverage */
async function evaluateGate3(orgId: string, siteId: string): Promise<GateResult> {
  const [groups, employeeCount, groupsWithTasks, membersCount] = await Promise.all([
    prisma.homogeneousWorkerGroup.count({ where: { siteId, organizationId: orgId, isActive: true } }),
    prisma.employee.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.homogeneousWorkerGroup.count({
      where: {
        siteId,
        organizationId: orgId,
        isActive:       true,
        taskLinks:      { some: {} },
      },
    }),
    prisma.workerGroupMember.count({
      where: { group: { siteId, organizationId: orgId } },
    }),
  ])

  const allGroupsHaveTasks = groups > 0 && groupsWithTasks === groups

  const items: GateItem[] = [
    {
      key: 'groupsDefined', label: 'Homogeneous worker groups defined',
      passed: groups > 0, severity: 'CRITICAL',
      reason: 'No homogeneous worker groups have been defined for this site.',
    },
    {
      key: 'workersInGroups', label: 'Workers assigned to groups',
      passed: membersCount > 0 && membersCount >= Math.min(employeeCount, 1),
      severity: 'MANDATORY',
      reason: 'No workers have been assigned to any homogeneous group.',
    },
    {
      key: 'groupsHaveTasks', label: 'All worker groups linked to tasks',
      passed: allGroupsHaveTasks, severity: 'MANDATORY',
      reason: `${groups - groupsWithTasks} worker group(s) have no tasks assigned yet.`,
    },
  ]

  return { passed: items.every((i) => i.severity !== 'CRITICAL' || i.passed), items }
}

/** Gate 4 — Process and task inventory */
async function evaluateGate4(siteId: string): Promise<GateResult> {
  const [processCount, taskCount, tasksWithoutGroups, tasksWithoutScreening, groupsWithoutTasks] =
    await Promise.all([
      prisma.siteProcess.count({ where: { siteId, isActive: true } }),
      prisma.siteTask.count({
        where: { activity: { process: { siteId } }, isActive: true },
      }),
      prisma.siteTask.count({
        where: {
          activity: { process: { siteId } },
          isActive:    true,
          workerGroups: { none: {} },
        },
      }),
      prisma.siteTask.count({
        where: {
          activity:        { process: { siteId } },
          isActive:        true,
          hazardScreenings: { none: {} },
        },
      }),
      prisma.homogeneousWorkerGroup.count({
        where: {
          siteId,
          isActive:  true,
          taskLinks: { none: {} },
        },
      }),
    ])

  const items: GateItem[] = [
    {
      key: 'processExists', label: 'At least one process defined',
      passed: processCount > 0, severity: 'CRITICAL',
      reason: 'No work processes have been defined for this site.',
    },
    {
      key: 'tasksExist', label: 'At least one task defined',
      passed: taskCount > 0, severity: 'MANDATORY',
      reason: 'No tasks have been defined. Add tasks under a process and activity.',
    },
    {
      key: 'tasksHaveGroups', label: 'All tasks linked to worker groups',
      passed: taskCount > 0 && tasksWithoutGroups === 0, severity: 'MANDATORY',
      reason: `${tasksWithoutGroups} task(s) have no worker group assigned.`,
    },
    {
      key: 'tasksScreened', label: 'All tasks have hazard screening',
      passed: taskCount > 0 && tasksWithoutScreening === 0, severity: 'MANDATORY',
      reason: `${tasksWithoutScreening} task(s) have no hazard screening records (R01–R22).`,
    },
    {
      key: 'noOrphanGroups', label: 'No worker groups without tasks',
      passed: groupsWithoutTasks === 0, severity: 'WARNING',
      reason: `${groupsWithoutTasks} worker group(s) are not linked to any task.`,
    },
  ]

  return { passed: items.every((i) => i.severity !== 'CRITICAL' || i.passed), items }
}

/** Gate 5 — Site equipment register */
async function evaluateGate5(orgId: string, siteId: string): Promise<GateResult> {
  const now = new Date()
  const [equipmentCount, overdueCount] = await Promise.all([
    prisma.siteEquipment.count({ where: { siteId, organizationId: orgId, isActive: true } }),
    prisma.siteEquipment.count({
      where: {
        siteId, organizationId: orgId, isActive: true,
        nextInspectionDate: { lt: now },
      },
    }),
  ])

  const items: GateItem[] = [
    {
      key: 'equipmentRegistered', label: 'Equipment register populated',
      passed: equipmentCount > 0, severity: 'MANDATORY',
      reason: 'No equipment has been registered for this site.',
    },
    {
      key: 'noOverdueInspections', label: 'No overdue equipment inspections',
      passed: overdueCount === 0, severity: 'MANDATORY',
      reason: `${overdueCount} piece(s) of equipment have an overdue inspection.`,
    },
  ]

  return { passed: items.every((i) => i.severity !== 'CRITICAL' || i.passed), items }
}

/** Gate 6 — Risk assessment completeness */
async function evaluateGate6(siteId: string): Promise<GateResult> {
  const [applicableCount, assessedCount, highUnmitigatedCount] = await Promise.all([
    prisma.taskHazardScreening.count({
      where: { isApplicable: true, task: { activity: { process: { siteId } } } },
    }),
    prisma.taskHazardScreening.count({
      where: {
        isApplicable: true,
        task:         { activity: { process: { siteId } } },
        probability:  { not: null },
        damage:       { not: null },
      },
    }),
    prisma.taskHazardScreening.count({
      where: {
        isApplicable: true,
        task:         { activity: { process: { siteId } } },
        riskClass:    'HIGH',
        residualRiskClass: { not: 'LOW' },
      },
    }),
  ])

  const allAssessed = applicableCount > 0 && assessedCount === applicableCount

  const items: GateItem[] = [
    {
      key:      'applicableAssessed',
      label:    'All applicable hazards risk-assessed (P × D)',
      passed:   allAssessed,
      severity: 'CRITICAL',
      reason:   applicableCount === 0
        ? 'No applicable hazards found — complete hazard screening first.'
        : `${applicableCount - assessedCount} applicable hazard(s) still missing P and D values.`,
    },
    {
      key:      'noUnmitigatedHigh',
      label:    'No unmitigated HIGH risks remaining',
      passed:   highUnmitigatedCount === 0,
      severity: 'MANDATORY',
      reason:   `${highUnmitigatedCount} hazard(s) are HIGH risk with no effective mitigation (residual risk not LOW).`,
    },
  ]

  return { passed: items.every((i) => i.severity !== 'CRITICAL' || i.passed), items }
}

/** Gate 7 — Training coverage */
async function evaluateGate7(orgId: string, siteId: string): Promise<GateResult & { groupCoverage: Gate7GroupCoverage[] }> {
  const now  = new Date()
  const soon = new Date()
  soon.setDate(soon.getDate() + 60)

  const groups = await prisma.homogeneousWorkerGroup.findMany({
    where:   { siteId, organizationId: orgId, isActive: true },
    select:  { id: true, name: true, code: true },
    orderBy: { code: 'asc' },
  })

  const groupCoverage: Gate7GroupCoverage[] = await Promise.all(
    groups.map(async (g) => {
      const count = await prisma.siteTrainingRecord.count({
        where: {
          workerGroupId:  g.id,
          organizationId: orgId,
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } },
          ],
        },
      })
      return { groupId: g.id, groupName: g.name, groupCode: g.code, hasTrained: count > 0 }
    })
  )

  const uncoveredGroups = groupCoverage.filter((g) => !g.hasTrained)

  const items: GateItem[] = [
    {
      key:      'groupsTrained',
      label:    'All worker groups have valid safety training',
      passed:   groups.length > 0 && uncoveredGroups.length === 0,
      severity: 'MANDATORY',
      reason:   groups.length === 0
        ? 'No worker groups defined — define groups first.'
        : `${uncoveredGroups.length} worker group(s) have no valid training record: ${uncoveredGroups.map((g) => g.groupCode).join(', ')}.`,
    },
  ]

  return {
    passed:        groups.length > 0 && uncoveredGroups.length === 0,
    items,
    groupCoverage,
  }
}

export async function evaluateReadiness(orgId: string, siteId: string): Promise<ReadinessResult | null> {
  const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
  if (!site) return null

  const [gate1, gate2, gate3, gate4, gate5, gate6, gate7] = await Promise.all([
    evaluateGate1(orgId, site),
    evaluateGate2(orgId, siteId),
    evaluateGate3(orgId, siteId),
    evaluateGate4(siteId),
    evaluateGate5(orgId, siteId),
    evaluateGate6(siteId),
    evaluateGate7(orgId, siteId),
  ])

  const allItems = [
    ...gate1.items, ...gate2.items, ...gate3.items,
    ...gate4.items, ...gate5.items, ...gate6.items, ...gate7.items,
  ]
  const criticalBlockers = allItems.filter((i) => i.severity === 'CRITICAL' && !i.passed).length
  const mandatoryMissing = allItems.filter((i) => i.severity === 'MANDATORY' && !i.passed).length

  return {
    gate1, gate2, gate3, gate4, gate5, gate6, gate7,
    overallPassed:    criticalBlockers === 0 && mandatoryMissing === 0,
    criticalBlockers,
    mandatoryMissing,
  }
}
