/**
 * Prisma seed script.
 * Seeds default country rule sets, formula variables, and a demo tenant.
 *
 * Run: pnpm dlx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'
import { COUNTRY_RULE_SETS } from './seed-data/country-rules'

const prisma = new PrismaClient()

const SYSTEM_VARIABLES = [
  { key: 'basicSalary', label: 'Basic Salary', description: 'Employee monthly basic salary', isSystem: true },
  { key: 'grossSalary', label: 'Gross Salary', description: 'Total earnings before deductions', isSystem: true },
  { key: 'yearsOfService', label: 'Years of Service', description: 'Number of full years employed', isSystem: true },
  { key: 'monthsOfService', label: 'Months of Service', description: 'Total months employed', isSystem: true },
  { key: 'age', label: 'Employee Age', description: 'Employee age in years', isSystem: true },
  { key: 'daysInMonth', label: 'Days in Month', description: 'Calendar days in the payroll month', isSystem: true },
  { key: 'workedDays', label: 'Worked Days', description: 'Actual days worked this month', isSystem: true },
  { key: 'unpaidLeaveDays', label: 'Unpaid Leave Days', description: 'Days of unpaid leave taken', isSystem: true },
  { key: 'proratedFactor', label: 'Prorated Factor', description: 'workedDays / daysInMonth', isSystem: true },
  // GCC rates
  { key: 'gosiRate', label: 'GOSI Employee Rate', description: 'GOSI employee contribution rate (decimal)', isSystem: false },
  { key: 'gosiEmployerRate', label: 'GOSI Employer Rate', description: 'GOSI employer contribution rate (decimal)', isSystem: false },
  { key: 'housingAllowanceRate', label: 'Housing Allowance Rate', description: 'Housing allowance as fraction of basic', isSystem: false },
  // India
  { key: 'pfCeiling', label: 'PF Ceiling', description: 'Maximum salary subject to PF (INR 15,000)', isSystem: false },
  { key: 'esicCeiling', label: 'ESIC Ceiling', description: 'Maximum gross for ESIC eligibility', isSystem: false },
]

async function main() {
  console.log('🌱 Starting seed...')

  // ─── 1. Upsert system formula variables ────────────────────────────────────
  console.log('📊 Seeding formula variables...')
  for (const v of SYSTEM_VARIABLES) {
    const existingVar = await prisma.formulaVariable.findFirst({
      where: { key: v.key, organizationId: null },
    })
    if (existingVar) {
      await prisma.formulaVariable.update({
        where: { id: existingVar.id },
        data: { label: v.label, description: v.description ?? null },
      })
    } else {
      await prisma.formulaVariable.create({
        data: {
          key: v.key,
          label: v.label,
          description: v.description ?? null,
          isSystem: v.isSystem,
          sourceType: 'EMPLOYEE_FIELD',
        },
      })
    }
  }
  console.log(`✅ ${SYSTEM_VARIABLES.length} formula variables seeded`)

  // ─── 2. Upsert country rule sets ───────────────────────────────────────────
  console.log('🌍 Seeding country rule sets...')
  let ruleSetCount = 0
  let ruleCount = 0

  for (const ruleSet of COUNTRY_RULE_SETS) {
    const existing = await prisma.countryRuleSet.findFirst({
      where: { country: ruleSet.country, year: ruleSet.year, organizationId: null },
    })

    let ruleSetId: string

    if (existing) {
      ruleSetId = existing.id
      console.log(`  ↻ Updating ${ruleSet.name}`)
    } else {
      const created = await prisma.countryRuleSet.create({
        data: {
          country: ruleSet.country,
          name: ruleSet.name,
          year: ruleSet.year,
          isDefault: ruleSet.isDefault,
          isActive: ruleSet.isActive,
        },
      })
      ruleSetId = created.id
      console.log(`  + Created ${ruleSet.name}`)
      ruleSetCount++
    }

    // Upsert rules for this rule set
    for (const rule of ruleSet.rules) {
      const existingRule = await prisma.payrollRule.findFirst({
        where: { ruleSetId, name: rule.name },
      })

      if (existingRule) {
        await prisma.payrollRule.update({
          where: { id: existingRule.id },
          data: {
            formula: rule.formula,
            type: rule.type,
            applicableTo: rule.applicableTo,
            description: rule.description ?? null,
            order: rule.order,
          },
        })
      } else {
        await prisma.payrollRule.create({
          data: {
            ruleSetId,
            name: rule.name,
            formula: rule.formula,
            type: rule.type,
            applicableTo: rule.applicableTo,
            description: rule.description ?? null,
            order: rule.order,
            isActive: true,
          },
        })
        ruleCount++
      }
    }
  }

  console.log(`✅ ${COUNTRY_RULE_SETS.length} country rule sets processed (${ruleSetCount} new, ${ruleCount} rules added)`)

  // ─── 3. Seed demo organization ─────────────────────────────────────────────
  const demoSlug = 'demo-holding-group'
  const existingDemo = await prisma.organization.findUnique({ where: { slug: demoSlug } })

  if (!existingDemo) {
    console.log('🏢 Creating demo organization...')
    const org = await prisma.organization.create({
      data: {
        name: 'Demo Holding Group',
        slug: demoSlug,
        country: 'SA',
        isActive: true,
      },
    })

    // Seed demo employees across 4 countries
    const demoEmployees = [
      { employeeNumber: 'EMP-001', fullName: 'Ahmed Al-Rashidi', email: 'ahmed@demo.com', country: 'SA', employmentType: 'LOCAL' as const, basicSalary: 12000, currency: 'SAR', department: 'Finance', jobTitle: 'CFO', nationality: 'Saudi', yearsOfService: 5 },
      { employeeNumber: 'EMP-002', fullName: 'Priya Sharma', email: 'priya@demo.com', country: 'SA', employmentType: 'EXPATRIATE' as const, basicSalary: 8000, currency: 'SAR', department: 'IT', jobTitle: 'Software Engineer', nationality: 'Indian', yearsOfService: 2 },
      { employeeNumber: 'EMP-003', fullName: 'Mohammed Al-Harbi', email: 'mohammed@demo.com', country: 'AE', employmentType: 'LOCAL' as const, basicSalary: 18000, currency: 'AED', department: 'Operations', jobTitle: 'Operations Director', nationality: 'Emirati', yearsOfService: 7 },
      { employeeNumber: 'EMP-004', fullName: 'Rania Hassan', email: 'rania@demo.com', country: 'EG', employmentType: 'LOCAL' as const, basicSalary: 15000, currency: 'EGP', department: 'HR', jobTitle: 'HR Manager', nationality: 'Egyptian', yearsOfService: 3 },
      { employeeNumber: 'EMP-005', fullName: 'Marco Ricci', email: 'marco@demo.com', country: 'IT', employmentType: 'LOCAL' as const, basicSalary: 3200, currency: 'EUR', department: 'Sales', jobTitle: 'Sales Manager', nationality: 'Italian', yearsOfService: 4 },
      { employeeNumber: 'EMP-006', fullName: 'Juan dela Cruz', email: 'juan@demo.com', country: 'SA', employmentType: 'EXPATRIATE' as const, basicSalary: 5000, currency: 'SAR', department: 'Facilities', jobTitle: 'Facilities Officer', nationality: 'Filipino', yearsOfService: 1 },
    ]

    for (const emp of demoEmployees) {
      const { basicSalary, currency, yearsOfService, ...employeeFields } = emp
      const joinDate = new Date()
      joinDate.setFullYear(joinDate.getFullYear() - yearsOfService)

      await prisma.employee.create({
        data: {
          ...employeeFields,
          organizationId: org.id,
          joinDate,
          isActive: true,
          salaryStructure: {
            create: { basicSalary, currency },
          },
        },
      })
    }

    console.log(`✅ Demo org created with ${demoEmployees.length} employees`)
  } else {
    console.log('ℹ️  Demo organization already exists — skipping')
  }

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
