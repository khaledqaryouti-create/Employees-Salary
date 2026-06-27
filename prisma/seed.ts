/**
 * Prisma seed script.
 * Seeds default country rule sets, formula variables, and a demo tenant.
 *
 * Run: pnpm dlx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { COUNTRY_RULE_SETS } from './seed-data/country-rules'

const connectionString = process.env['DATABASE_URL'] // NOSONAR — value comes from env, no credentials in source
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is required to run the seed script. ' +
    'Set it in .env.local — see .env.example for the expected format.',
  )
}
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

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

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function upsertFormulaVariable(v: typeof SYSTEM_VARIABLES[number]) {
  const existing = await prisma.formulaVariable.findFirst({
    where: { key: v.key, organizationId: null },
  })
  if (existing) {
    await prisma.formulaVariable.update({
      where: { id: existing.id },
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

async function upsertRuleSetRules(ruleSetId: string, rules: typeof COUNTRY_RULE_SETS[number]['rules']): Promise<number> {
  let added = 0
  for (const rule of rules) {
    const existing = await prisma.payrollRule.findFirst({ where: { ruleSetId, name: rule.name } })
    if (existing) {
      await prisma.payrollRule.update({
        where: { id: existing.id },
        data: { formula: rule.formula, type: rule.type, applicableTo: rule.applicableTo, description: rule.description ?? null, order: rule.order },
      })
    } else {
      await prisma.payrollRule.create({
        data: { ruleSetId, name: rule.name, formula: rule.formula, type: rule.type, applicableTo: rule.applicableTo, description: rule.description ?? null, order: rule.order, isActive: true },
      })
      added++
    }
  }
  return added
}

async function upsertCountryRuleSet(ruleSet: typeof COUNTRY_RULE_SETS[number]): Promise<{ isNew: boolean; rulesAdded: number }> {
  const existing = await prisma.countryRuleSet.findFirst({
    where: { country: ruleSet.country, year: ruleSet.year, organizationId: null },
  })

  let ruleSetId: string
  let isNew = false

  if (existing) {
    ruleSetId = existing.id
    console.log(`  ↻ Updating ${ruleSet.name}`)
  } else {
    const created = await prisma.countryRuleSet.create({
      data: { country: ruleSet.country, name: ruleSet.name, year: ruleSet.year, isDefault: ruleSet.isDefault, isActive: ruleSet.isActive },
    })
    ruleSetId = created.id
    isNew = true
    console.log(`  + Created ${ruleSet.name}`)
  }

  const rulesAdded = await upsertRuleSetRules(ruleSetId, ruleSet.rules)
  return { isNew, rulesAdded }
}

// ── Demo org seeders ──────────────────────────────────────────────────────────

type DemoEmployee = {
  employeeNumber: string; fullName: string; email: string; country: string
  employmentType: 'LOCAL' | 'EXPATRIATE'; basicSalary: number; currency: string
  department: string; jobTitle: string; nationality: string; yearsOfService: number
}

async function createDemoEmployees(orgId: string, employees: DemoEmployee[]) {
  for (const emp of employees) {
    const { basicSalary, currency, yearsOfService, ...fields } = emp
    const joinDate = new Date()
    joinDate.setFullYear(joinDate.getFullYear() - yearsOfService)
    await prisma.employee.create({
      data: { ...fields, organizationId: orgId, joinDate, isActive: true,
        salaryStructure: { create: { basicSalary, currency } } },
    })
  }
}

async function seedDemoOrg() {
  const slug = 'demo-holding-group'
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) { console.log('ℹ️  Demo organization already exists — skipping'); return }

  console.log('🏢 Creating demo organization...')
  const org = await prisma.organization.create({
    data: { name: 'Demo Holding Group', slug, country: 'SA', isActive: true },
  })

  const employees: DemoEmployee[] = [
    { employeeNumber: 'EMP-001', fullName: 'Ahmed Al-Rashidi', email: 'ahmed@demo.com', country: 'SA', employmentType: 'LOCAL', basicSalary: 12000, currency: 'SAR', department: 'Finance', jobTitle: 'CFO', nationality: 'Saudi', yearsOfService: 5 },
    { employeeNumber: 'EMP-002', fullName: 'Priya Sharma', email: 'priya@demo.com', country: 'SA', employmentType: 'EXPATRIATE', basicSalary: 8000, currency: 'SAR', department: 'IT', jobTitle: 'Software Engineer', nationality: 'Indian', yearsOfService: 2 },
    { employeeNumber: 'EMP-003', fullName: 'Mohammed Al-Harbi', email: 'mohammed@demo.com', country: 'AE', employmentType: 'LOCAL', basicSalary: 18000, currency: 'AED', department: 'Operations', jobTitle: 'Operations Director', nationality: 'Emirati', yearsOfService: 7 },
    { employeeNumber: 'EMP-004', fullName: 'Rania Hassan', email: 'rania@demo.com', country: 'EG', employmentType: 'LOCAL', basicSalary: 15000, currency: 'EGP', department: 'HR', jobTitle: 'HR Manager', nationality: 'Egyptian', yearsOfService: 3 },
    { employeeNumber: 'EMP-005', fullName: 'Marco Ricci', email: 'marco@demo.com', country: 'IT', employmentType: 'LOCAL', basicSalary: 3200, currency: 'EUR', department: 'Sales', jobTitle: 'Sales Manager', nationality: 'Italian', yearsOfService: 4 },
    { employeeNumber: 'EMP-006', fullName: 'Juan dela Cruz', email: 'juan@demo.com', country: 'SA', employmentType: 'EXPATRIATE', basicSalary: 5000, currency: 'SAR', department: 'Facilities', jobTitle: 'Facilities Officer', nationality: 'Filipino', yearsOfService: 1 },
  ]
  await createDemoEmployees(org.id, employees)
  console.log(`✅ Demo org created with ${employees.length} employees`)
}

async function seedMarocOrg() {
  const slug = 'demo-maroc-tech'
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) { console.log('ℹ️  Maroc Tech already exists — skipping'); return }

  console.log('🏢 Creating Maroc Tech demo organization...')
  const org = await prisma.organization.create({
    data: { name: 'Maroc Tech SARL', slug, country: 'MA', currency: 'MAD', isActive: true },
  })

  const employees: DemoEmployee[] = [
    { employeeNumber: 'MT-001', fullName: 'Youssef Benali', email: 'youssef@maroctech.demo', country: 'MA', employmentType: 'LOCAL', basicSalary: 12000, currency: 'MAD', department: 'Engineering', jobTitle: 'Lead Developer', nationality: 'Moroccan', yearsOfService: 4 },
    { employeeNumber: 'MT-002', fullName: 'Fatima Zahra Idrissi', email: 'fatima@maroctech.demo', country: 'MA', employmentType: 'LOCAL', basicSalary: 9500, currency: 'MAD', department: 'Marketing', jobTitle: 'Marketing Manager', nationality: 'Moroccan', yearsOfService: 2 },
    { employeeNumber: 'MT-003', fullName: 'Karim Tazi', email: 'karim@maroctech.demo', country: 'MA', employmentType: 'LOCAL', basicSalary: 7500, currency: 'MAD', department: 'Support', jobTitle: 'Customer Success', nationality: 'Moroccan', yearsOfService: 1 },
    { employeeNumber: 'MT-004', fullName: 'Amina Chraibi', email: 'amina@maroctech.demo', country: 'TN', employmentType: 'EXPATRIATE', basicSalary: 8000, currency: 'MAD', department: 'Finance', jobTitle: 'Financial Analyst', nationality: 'Tunisian', yearsOfService: 3 },
  ]
  await createDemoEmployees(org.id, employees)
  console.log(`✅ Maroc Tech created with ${employees.length} employees`)
}

async function seedPHOrg() {
  const slug = 'demo-ph-staffing'
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) { console.log('ℹ️  Pacific Staffing Corp already exists — skipping'); return }

  console.log('🏢 Creating PH Staffing demo organization...')
  const org = await prisma.organization.create({
    data: { name: 'Pacific Staffing Corp', slug, country: 'PH', currency: 'PHP', isActive: true },
  })

  const employees: DemoEmployee[] = [
    { employeeNumber: 'PS-001', fullName: 'Maria Santos', email: 'maria@pacific.demo', country: 'PH', employmentType: 'LOCAL', basicSalary: 45000, currency: 'PHP', department: 'HR', jobTitle: 'HR Director', nationality: 'Filipino', yearsOfService: 6 },
    { employeeNumber: 'PS-002', fullName: 'Jose Reyes', email: 'jose@pacific.demo', country: 'PH', employmentType: 'LOCAL', basicSalary: 35000, currency: 'PHP', department: 'Operations', jobTitle: 'Operations Manager', nationality: 'Filipino', yearsOfService: 3 },
    { employeeNumber: 'PS-003', fullName: 'Ana Gonzales', email: 'ana@pacific.demo', country: 'PH', employmentType: 'LOCAL', basicSalary: 28000, currency: 'PHP', department: 'Accounting', jobTitle: 'Accountant', nationality: 'Filipino', yearsOfService: 2 },
    { employeeNumber: 'PS-004', fullName: 'Carlo Ramos', email: 'carlo@pacific.demo', country: 'PH', employmentType: 'LOCAL', basicSalary: 22000, currency: 'PHP', department: 'IT', jobTitle: 'IT Support', nationality: 'Filipino', yearsOfService: 1 },
    { employeeNumber: 'PS-005', fullName: 'Grace Lim', email: 'grace@pacific.demo', country: 'PH', employmentType: 'LOCAL', basicSalary: 30000, currency: 'PHP', department: 'Sales', jobTitle: 'Sales Executive', nationality: 'Filipino', yearsOfService: 4 },
  ]
  await createDemoEmployees(org.id, employees)
  console.log(`✅ Pacific Staffing Corp created with ${employees.length} employees`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...')

  // ─── 1. Upsert system formula variables ────────────────────────────────────
  console.log('📊 Seeding formula variables...')
  for (const v of SYSTEM_VARIABLES) {
    await upsertFormulaVariable(v)
  }
  console.log(`✅ ${SYSTEM_VARIABLES.length} formula variables seeded`)

  // ─── 2. Upsert country rule sets ───────────────────────────────────────────
  console.log('🌍 Seeding country rule sets...')
  let ruleSetCount = 0
  let ruleCount = 0

  for (const ruleSet of COUNTRY_RULE_SETS) {
    const { isNew, rulesAdded } = await upsertCountryRuleSet(ruleSet)
    if (isNew) ruleSetCount++
    ruleCount += rulesAdded
  }
  console.log(`✅ ${COUNTRY_RULE_SETS.length} country rule sets processed (${ruleSetCount} new, ${ruleCount} rules added)`)

  // ─── 3–5. Seed demo organizations ─────────────────────────────────────────
  await seedDemoOrg()
  await seedMarocOrg()
  await seedPHOrg()

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect().catch(() => {})
  })
