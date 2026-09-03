/**
 * Demo seed for DVR Phase 4A — Corrective Action Plan
 *
 * Run with: npx tsx prisma/seed-corrective-actions-demo.ts
 *
 * What it does:
 *  1. Lists all sites so you can pick one (or uses the first site found)
 *  2. Auto-creates CRITICAL actions for every HIGH-risk hazard with no action yet
 *  3. Inserts the 4 standard demo corrective actions from the Phase 4A usage guide
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma  = new PrismaClient({ adapter })

const HAZARD_LABELS: Record<string, string> = {
  R01: 'Falls from height',
  R02: 'Slips, trips and falls on the same level',
  R03: 'Struck by moving objects',
  R04: 'Struck against objects',
  R05: 'Contact with moving machinery',
  R06: 'Cuts, punctures and abrasions',
  R07: 'Manual handling / musculoskeletal',
  R08: 'Chemical agents',
  R09: 'Biological agents',
  R10: 'Noise and vibration',
  R11: 'Extreme temperatures',
  R12: 'Electrical hazards',
  R13: 'Fire and explosion',
  R14: 'Radiation',
  R15: 'Confined spaces',
  R16: 'Ergonomic hazards',
  R17: 'Psychosocial hazards',
  R18: 'Work at height / scaffolding',
  R19: 'Driving and transport',
  R20: 'Contractor and third-party interaction',
  R21: 'Environmental hazards',
  R22: 'Emergency situations',
}

async function main() {
  // ── Find the first active site ──────────────────────────────────────────────
  const sites = await prisma.site.findMany({
    select: { id: true, name: true, organizationId: true },
    where:  { isActive: true },
    take:   10,
  })

  if (sites.length === 0) {
    console.error('No active sites found. Create a site first via Settings → Sites.')
    return
  }

  console.log('\nAvailable sites:')
  sites.forEach((s, i) => console.log(`  [${i}] ${s.name}  (${s.id})`))

  const site = sites[0]!
  console.log(`\nUsing site: "${site.name}" (${site.id})\n`)

  const orgId   = site.organizationId
  const siteId  = site.id

  // Find a "system" employee to use as createdById & assignee fallback
  const anyEmployee = await prisma.employee.findFirst({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, fullName: true },
  })
  const createdById = anyEmployee?.id ?? 'system'
  console.log(`Using employee "${anyEmployee?.fullName ?? 'none'}" for assignments\n`)

  // ── Step 1: Auto-generate from HIGH-risk hazards ────────────────────────────
  console.log('--- Step 1: Auto-generate from HIGH-risk hazards ---')

  const highRiskHazards = await prisma.taskHazardScreening.findMany({
    where: {
      isApplicable:      true,
      riskClass:         'HIGH',
      task:              { activity: { process: { siteId } } },
      correctiveActions: { none: {} },
    },
    include: { task: { select: { name: true } } },
  })

  if (highRiskHazards.length === 0) {
    console.log('  No unmitigated HIGH-risk hazards found — skipping auto-generate.')
    console.log('  (To generate: go to Risk Assessment tab and set P×D so that R≥8 for at least one hazard)')
  } else {
    await prisma.correctiveAction.createMany({
      data: highRiskHazards.map((h) => ({
        organizationId: orgId,
        siteId,
        hazardId:       h.id,
        title:          `Mitigate ${h.hazardCode} — ${HAZARD_LABELS[h.hazardCode] ?? h.hazardCode} (${h.task.name})`,
        description:    h.mitigationMeasures
          ? `Current mitigation: ${h.mitigationMeasures}. Implement additional controls to reduce residual risk.`
          : 'Define and implement risk controls to reduce the residual risk to MEDIUM or LOW.',
        priority:    'CRITICAL',
        status:      'OPEN',
        createdById,
      })),
    })
    console.log(`  Created ${highRiskHazards.length} auto-generated action(s) from HIGH-risk hazards.`)
  }

  // ── Step 2: Insert the 4 standard demo actions ──────────────────────────────
  console.log('\n--- Step 2: Insert 4 standard demo corrective actions ---')

  const demoActions = [
    {
      title:       'Issue personal protective equipment to all site workers',
      description: 'Provide hard hats, safety boots, hi-vis vests and gloves. Maintain a PPE register with employee signatures.',
      priority:    'HIGH'    as const,
      status:      'IN_PROGRESS' as const,
      dueDate:     new Date('2026-08-15'),
    },
    {
      title:       'Conduct monthly fire and evacuation drill',
      description: 'Schedule and document monthly drills. Minimum 30 minutes per session. Records to be kept for 3 years.',
      priority:    'MEDIUM'  as const,
      status:      'OPEN'    as const,
      dueDate:     new Date('2026-08-31'),
    },
    {
      title:       'Install mandatory safety signage at all entry points and hazard zones',
      description: 'ISO 7010 compliant signs. Bilingual (EN + local language). Photograph each sign after installation.',
      priority:    'HIGH'    as const,
      status:      'COMPLETED' as const,
      dueDate:     new Date('2026-08-20'),
      completedDate:    new Date(),
      verificationNote: 'All 12 signs installed and photographed. See folder SafetySignage_2026-08.',
    },
    {
      title:       'Deliver site safety induction to all contractors before work begins',
      description: '2-hour induction covering site rules, emergency exits, PPE requirements, and hazard reporting procedure.',
      priority:    'CRITICAL' as const,
      status:      'OPEN'    as const,
      dueDate:     new Date('2026-08-10'),
    },
  ]

  for (const action of demoActions) {
    const exists = await prisma.correctiveAction.findFirst({
      where: { siteId, organizationId: orgId, title: action.title },
    })
    if (exists) {
      console.log(`  SKIP (already exists): "${action.title}"`)
      continue
    }
    await prisma.correctiveAction.create({
      data: {
        organizationId:  orgId,
        siteId,
        title:           action.title,
        description:     action.description,
        priority:        action.priority,
        status:          action.status,
        assignedToId:    anyEmployee?.id ?? null,
        dueDate:         action.dueDate,
        completedDate:   'completedDate' in action ? action.completedDate : null,
        verificationNote: 'verificationNote' in action ? action.verificationNote : null,
        createdById,
      },
    })
    console.log(`  Created: "${action.title}"  [${action.priority} / ${action.status}]`)
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const total = await prisma.correctiveAction.count({ where: { siteId, organizationId: orgId } })
  console.log(`\nDone. Total corrective actions for "${site.name}": ${total}`)
  console.log('\nNext: open Settings → Sites → your site → Action Plan tab to see the data.')
  console.log('      Go to DVR Readiness → Generate DVR Document to include Section 7 in the PDF.\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => void prisma.$disconnect())
