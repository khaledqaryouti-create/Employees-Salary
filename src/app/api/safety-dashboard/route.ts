import { NextRequest } from 'next/server'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function last6MonthKeys(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
  }
  return keys
}

function computeSafetyScore(
  dvrStatus: string,
  openActions: number,
  overdueActions: number,
  openIncidents: number,
  trainingValid: number,
  trainingTotal: number,
): number {
  let score = 50
  if (dvrStatus === 'APPROVED_AND_MONITORED')    score += 25
  else if (dvrStatus === 'CONSULTATION_AND_APPROVAL') score += 15
  else if (dvrStatus === 'ASSESSMENT_IN_PROGRESS')    score += 10
  else if (dvrStatus === 'READINESS_REVIEW')          score += 5
  score -= Math.min(overdueActions * 7 + openActions * 3, 30)
  score -= Math.min(openIncidents * 5, 20)
  if (trainingTotal > 0) score += Math.round((trainingValid / trainingTotal) * 25)
  return Math.max(0, Math.min(100, Math.round(score)))
}

function buildWhereFilters(orgId: string, branchId: string | undefined, dateField: string, fromDate?: Date, toDate?: Date) {
  const dateFilter = fromDate ?? toDate ? { gte: fromDate, lte: toDate } : undefined
  return {
    base: { organizationId: orgId, ...(branchId ? { site: { branchId } } : {}), ...(dateFilter ? { [dateField]: dateFilter } : {}) },
    site: { organizationId: orgId, isActive: true, ...(branchId ? { branchId } : {}) },
  }
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

function buildTrend(
  monthKeys: string[],
  incidentRows: { incidentDate: Date }[],
  actionRows: { createdAt: Date }[],
) {
  const inc = new Map<string, number>()
  const act = new Map<string, number>()
  for (const k of monthKeys) { inc.set(k, 0); act.set(k, 0) }
  for (const r of incidentRows) {
    const k = monthKey(new Date(r.incidentDate))
    if (inc.has(k)) inc.set(k, (inc.get(k) ?? 0) + 1)
  }
  for (const r of actionRows) {
    const k = monthKey(new Date(r.createdAt))
    if (act.has(k)) act.set(k, (act.get(k) ?? 0) + 1)
  }
  return monthKeys.map((k) => ({ month: k, incidents: inc.get(k) ?? 0, actions: act.get(k) ?? 0 }))
}

function buildContractorMaps(contractorData: { siteId: string; permits: { expiryDate: Date; status: string }[] }[]) {
  const today = new Date()
  const in30  = new Date(today); in30.setDate(today.getDate() + 30)
  const counts   = new Map<string, number>()
  const expiring = new Map<string, number>()
  for (const c of contractorData) {
    counts.set(c.siteId, (counts.get(c.siteId) ?? 0) + 1)
    for (const p of c.permits) {
      const exp = new Date(p.expiryDate)
      if (p.status !== 'REVOKED' && exp >= today && exp <= in30) {
        expiring.set(c.siteId, (expiring.get(c.siteId) ?? 0) + 1)
      }
    }
  }
  return { counts, expiring }
}

function buildScoreMaps(
  trainingRows: { siteId: string; status: string }[],
  actionRows:   { siteId: string; status: string }[],
  incidentRows: { siteId: string; status: string }[],
) {
  const train   = new Map<string, { valid: number; total: number }>()
  const open    = new Map<string, number>()
  const overdue = new Map<string, number>()
  const openInc = new Map<string, number>()

  for (const t of trainingRows) {
    const cur = train.get(t.siteId) ?? { valid: 0, total: 0 }
    cur.total++
    if (t.status === 'VALID') cur.valid++
    train.set(t.siteId, cur)
  }
  for (const a of actionRows) {
    if (['OPEN', 'IN_PROGRESS'].includes(a.status)) open.set(a.siteId, (open.get(a.siteId) ?? 0) + 1)
    if (a.status === 'OVERDUE') overdue.set(a.siteId, (overdue.get(a.siteId) ?? 0) + 1)
  }
  for (const i of incidentRows) {
    if (i.status !== 'CLOSED') openInc.set(i.siteId, (openInc.get(i.siteId) ?? 0) + 1)
  }
  return { train, open, overdue, openInc }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { searchParams } = new URL(req.url)

    const branchId = searchParams.get('branchId') ?? undefined
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const toDate   = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined

    const { base: incidentWhere, site: siteWhere } = buildWhereFilters(orgId, branchId, 'incidentDate', fromDate, toDate)
    const { base: actionWhere }   = buildWhereFilters(orgId, branchId, 'createdAt',    fromDate, toDate)
    const { base: trainingWhere } = buildWhereFilters(orgId, branchId, 'trainingDate', fromDate, toDate)
    const dvrWhere = { organizationId: orgId, ...(branchId ? { site: { branchId } } : {}) }

    const trendFrom = fromDate ?? (() => {
      const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return d
    })()
    const noDateBranch = { organizationId: orgId, ...(branchId ? { site: { branchId } } : {}) }

    const [
      dvrCounts, actionCounts, trainingCounts, incidentCounts,
      sites, branches, incidentTrend, actionTrend,
      contractorData, trainingBySite, actionBySite, incidentBySite,
    ] = await Promise.all([
      prisma.dvrSetup.groupBy({ by: ['status'], _count: { id: true }, where: dvrWhere }),
      prisma.correctiveAction.groupBy({ by: ['priority', 'status'], _count: { id: true }, where: actionWhere }),
      prisma.siteTrainingRecord.groupBy({ by: ['status'], _count: { id: true }, where: trainingWhere }),
      prisma.siteIncident.groupBy({ by: ['incidentType', 'status'], _count: { id: true }, where: incidentWhere }),
      prisma.site.findMany({
        where: siteWhere,
        select: { id: true, name: true, city: true, dvr: { select: { status: true } }, _count: { select: { correctiveActions: true, incidents: true, trainingRecords: true, contractors: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.branch.findMany({ where: { organizationId: orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.siteIncident.findMany({ where: { organizationId: orgId, incidentDate: { gte: trendFrom }, ...(branchId ? { site: { branchId } } : {}) }, select: { incidentDate: true } }),
      prisma.correctiveAction.findMany({ where: { organizationId: orgId, createdAt: { gte: trendFrom }, ...(branchId ? { site: { branchId } } : {}) }, select: { createdAt: true } }),
      prisma.contractor.findMany({ where: { ...noDateBranch, isActive: true }, select: { siteId: true, permits: { select: { expiryDate: true, status: true } } } }),
      prisma.siteTrainingRecord.findMany({ where: noDateBranch, select: { siteId: true, status: true } }),
      prisma.correctiveAction.findMany({ where: noDateBranch, select: { siteId: true, status: true } }),
      prisma.siteIncident.findMany({ where: noDateBranch, select: { siteId: true, status: true } }),
    ])

    const monthKeys = last6MonthKeys()
    const trend     = buildTrend(monthKeys, incidentTrend, actionTrend)
    const { counts: contractorCountBySite, expiring: expiringPermitsBySite } = buildContractorMaps(contractorData)
    const { train, open, overdue, openInc } = buildScoreMaps(trainingBySite, actionBySite, incidentBySite)

    const openActionStatuses = new Set(['OPEN', 'IN_PROGRESS', 'OVERDUE'])
    const openActions   = actionCounts.filter((r) => openActionStatuses.has(r.status)).reduce((s, r) => s + r._count.id, 0)
    const openIncidents = incidentCounts.filter((r) => r.status !== 'CLOSED').reduce((s, r) => s + r._count.id, 0)
    const approvedSites = dvrCounts.filter((r) => r.status === 'APPROVED_AND_MONITORED').reduce((s, r) => s + r._count.id, 0)

    const siteSummaries = sites.map((s) => {
      const dvrStatus  = s.dvr?.status ?? 'SETUP'
      const trainData  = train.get(s.id) ?? { valid: 0, total: 0 }
      return {
        id: s.id, name: s.name, city: s.city, dvrStatus,
        safetyScore: computeSafetyScore(dvrStatus, open.get(s.id) ?? 0, overdue.get(s.id) ?? 0, openInc.get(s.id) ?? 0, trainData.valid, trainData.total),
        actions: s._count.correctiveActions, incidents: s._count.incidents,
        training: s._count.trainingRecords, trainingValid: trainData.valid, trainingTotal: trainData.total,
        contractors: contractorCountBySite.get(s.id) ?? 0, expiringPermits: expiringPermitsBySite.get(s.id) ?? 0,
      }
    })

    return success({
      totals: { sites: sites.length, approvedSites, openActions, openIncidents },
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      dvrCounts:      dvrCounts.map((r) => ({ status: r.status, count: r._count.id })),
      actionCounts:   actionCounts.map((r) => ({ priority: r.priority, status: r.status, count: r._count.id })),
      trainingCounts: trainingCounts.map((r) => ({ status: r.status, count: r._count.id })),
      incidentCounts: incidentCounts.map((r) => ({ incidentType: r.incidentType, status: r.status, count: r._count.id })),
      trend,
      sites: siteSummaries,
    })
  } catch (err) {
    logger.error('safety-dashboard-get', { error: err })
    return error('ERR_FETCH', 'Failed to load safety dashboard', 500)
  }
}
