/**
 * Seed script: Italy safety requirements (D.Lgs. 81/2008 + Codice di Prevenzione Incendi + CEI norms).
 * Run with: pnpm tsx prisma/seed-safety-italy.ts
 * Safe to re-run — uses upsert on (countryId, title).
 *
 * ⚠️  This is a starting reference set. Have an Italian RSPP/CSP-CSE/fire-safety
 *     professional review thresholds and trigger conditions before production use.
 */

import 'dotenv/config'
import { PrismaClient, ProjectType, SafetyRequirementCategory } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma  = new PrismaClient({ adapter })

interface SeedReq {
  projectTypes:     ProjectType[]
  category:         SafetyRequirementCategory
  title:            string
  description:      string
  legalReference:   string
  triggerCondition?: string
  requiredRole?:    string
  requiredDocument?: string
  mandatory:        boolean
  recurring?:       boolean
  recurrenceMonths?: number
  sortOrder:        number
}

const REQUIREMENTS: SeedReq[] = [
  // ─── GENERAL_OHS — applies to ALL project types ────────────────────────────
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER'],
    category:        'GENERAL_OHS' as const,
    title:           'Documento di Valutazione dei Rischi (DVR)',
    description:     'Risk assessment document covering all workplace hazards, required before work starts. Must be kept up to date whenever conditions change.',
    legalReference:  'D.Lgs. 81/2008, Art. 28-29',
    requiredRole:    'Employer / RSPP',
    requiredDocument:'DVR document',
    mandatory:       true,
    sortOrder:       10,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER'],
    category:        'GENERAL_OHS' as const,
    title:           'Nomina RSPP (Responsabile Servizio Prevenzione e Protezione)',
    description:     'Formal appointment of the person responsible for health and safety prevention and protection services.',
    legalReference:  'D.Lgs. 81/2008, Art. 31-32',
    requiredRole:    'RSPP',
    requiredDocument:'RSPP appointment letter',
    mandatory:       true,
    sortOrder:       20,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER'],
    category:        'GENERAL_OHS' as const,
    title:           'Nomina Medico Competente',
    description:     'Appointment of the competent physician responsible for health surveillance of workers exposed to specific risks.',
    legalReference:  'D.Lgs. 81/2008, Art. 25, 41',
    requiredRole:    'Medico competente',
    requiredDocument:'Medico competente appointment',
    mandatory:       true,
    sortOrder:       30,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER'],
    category:        'GENERAL_OHS' as const,
    title:           'Formazione lavoratori (general + specific risk training)',
    description:     'Mandatory general and risk-specific safety training for all workers, plus refresher training per the State-Region Agreement.',
    legalReference:  'D.Lgs. 81/2008, Art. 36-37; Accordo Stato-Regioni',
    requiredDocument:'Training certificates',
    mandatory:       true,
    sortOrder:       40,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER'],
    category:        'GENERAL_OHS' as const,
    title:           'Piano di emergenza ed evacuazione',
    description:     'Emergency and evacuation plan covering fire, first aid, and other emergency scenarios.',
    legalReference:  'D.Lgs. 81/2008, Art. 46; D.M. 2/09/2021',
    requiredDocument:'Emergency plan document',
    mandatory:       true,
    sortOrder:       50,
  },

  // ─── CONSTRUCTION_SITE — Factory, Tower, or any project with hasMultipleContractors ──
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'Nomina Coordinatore Sicurezza in fase di Progettazione (CSP)',
    description:     'Appointment of the safety coordinator during the design phase, mandatory when multiple contractors are involved.',
    legalReference:  'D.Lgs. 81/2008, Art. 90',
    triggerCondition:'hasMultipleContractors = true',
    requiredRole:    'CSP',
    requiredDocument:'CSP appointment',
    mandatory:       true,
    sortOrder:       10,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'Nomina Coordinatore Sicurezza in fase di Esecuzione (CSE)',
    description:     'Appointment of the safety coordinator during the execution phase, mandatory when multiple contractors are involved.',
    legalReference:  'D.Lgs. 81/2008, Art. 90-92',
    triggerCondition:'hasMultipleContractors = true',
    requiredRole:    'CSE',
    requiredDocument:'CSE appointment',
    mandatory:       true,
    sortOrder:       20,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'Piano di Sicurezza e Coordinamento (PSC)',
    description:     'Safety and coordination plan drafted by the CSP, required on sites with multiple contractors. Sets out site safety rules and coordination procedures.',
    legalReference:  'D.Lgs. 81/2008, Art. 100; Allegato XV',
    triggerCondition:'hasMultipleContractors = true',
    requiredDocument:'PSC document',
    mandatory:       true,
    sortOrder:       30,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'Piano Operativo di Sicurezza (POS) per each executing company',
    description:     'Each executing contractor must prepare their own operational safety plan describing the specific hazards and measures for their scope of work.',
    legalReference:  'D.Lgs. 81/2008, Art. 89(h); Allegato XV',
    requiredDocument:'POS document per contractor',
    mandatory:       true,
    sortOrder:       40,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'Notifica preliminare (site-opening notice to authorities)',
    description:     'Preliminary notice to the local labour inspectorate (ITL) and ASL before works start on qualifying construction sites.',
    legalReference:  'D.Lgs. 81/2008, Art. 99',
    triggerCondition:'before works start',
    requiredDocument:'Filed notification',
    mandatory:       true,
    sortOrder:       50,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'Fascicolo dell\'Opera (for future maintenance safety)',
    description:     'Safety file for the completed structure, documenting all information needed for future maintenance work to be carried out safely.',
    legalReference:  'D.Lgs. 81/2008, Allegato XVI',
    triggerCondition:'at project completion',
    requiredDocument:'Fascicolo document',
    mandatory:       true,
    sortOrder:       60,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'PIMUS (scaffolding erection/use/dismantling plan)',
    description:     'Piano di Montaggio, Uso e Smontaggio — mandatory work plan for scaffolding operations, to be prepared by a qualified professional.',
    legalReference:  'D.Lgs. 81/2008, Titolo IV',
    triggerCondition:'scaffolding present',
    requiredDocument:'PIMUS document',
    mandatory:       false,
    sortOrder:       70,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE'],
    category:        'CONSTRUCTION_SITE' as const,
    title:           'Verifica idoneità tecnico-professionale of contractors',
    description:     'Verification of the technical and professional suitability of all contractors and sub-contractors before they start work on site.',
    legalReference:  'D.Lgs. 81/2008, Art. 90, Allegato XVII',
    triggerCondition:'hasMultipleContractors = true',
    requiredDocument:'Verification checklist',
    mandatory:       true,
    sortOrder:       80,
  },

  // ─── FIRE_SAFETY — Factory, Tower, Data Center ─────────────────────────────
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'DATA_CENTER'],
    category:        'FIRE_SAFETY' as const,
    title:           'Classification of activity under DPR 151/2011 Allegato I',
    description:     'Determine whether the activity falls within one of the categories listed in Allegato I of DPR 151/2011, which determines whether fire-prevention filing is required and its type (A/B/C).',
    legalReference:  'D.P.R. 1 agosto 2011, n. 151',
    triggerCondition:'industrial/civil occupancy',
    requiredDocument:'Classification record',
    mandatory:       true,
    sortOrder:       10,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'DATA_CENTER'],
    category:        'FIRE_SAFETY' as const,
    title:           'Application of Codice di Prevenzione Incendi (fire risk profile, RTO + RTV)',
    description:     'Apply the general horizontal rules (RTO) and relevant vertical rules (RTV) of the Codice di Prevenzione Incendi (D.M. 3 agosto 2015) to the project fire-safety design.',
    legalReference:  'D.M. 3 agosto 2015 (Codice di Prevenzione Incendi)',
    triggerCondition:'attività soggetta a controllo VVF',
    requiredRole:    'Fire engineer / CSE',
    requiredDocument:'Fire safety design',
    mandatory:       true,
    sortOrder:       20,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'DATA_CENTER'],
    category:        'FIRE_SAFETY' as const,
    title:           'SCIA Antincendio / fire prevention filing with Vigili del Fuoco',
    description:     'SCIA antincendio filing with the local Vigili del Fuoco fire-prevention office, required before opening/use for category B and C activities.',
    legalReference:  'D.P.R. 151/2011, Art. 4',
    triggerCondition:'attività soggetta a controllo VVF (Cat B or C)',
    requiredDocument:'SCIA filing',
    mandatory:       true,
    sortOrder:       30,
  },
  {
    projectTypes:    ['TOWER_HIGH_RISE'],
    category:        'FIRE_SAFETY' as const,
    title:           '"Altezza antincendio" classification',
    description:     'Classify the building by its fire-safety height (altezza antincendio = height from lowest accessible level to highest occupied floor). This determines which Codice di Prevenzione Incendi vertical rules (RTV) apply and which fire-resistance ratings are required.',
    legalReference:  'Codice di Prevenzione Incendi — definitions section',
    triggerCondition:'buildingHeightMeters set',
    requiredDocument:'Height classification record',
    mandatory:       true,
    sortOrder:       35,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'DATA_CENTER'],
    category:        'FIRE_SAFETY' as const,
    title:           'Fire-resistance rating and compartmentation design',
    description:     'Design and document fire-resistance ratings (REI) for structural elements and compartmentation measures per the Codice di Prevenzione Incendi Chapter S.2.',
    legalReference:  'Codice di Prevenzione Incendi, Cap. S.2',
    requiredDocument:'Design documentation',
    mandatory:       true,
    sortOrder:       40,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'DATA_CENTER'],
    category:        'FIRE_SAFETY' as const,
    title:           'Fire detection/suppression systems design and certification',
    description:     'Design, installation, and certification of active fire protection systems (detection, sprinklers, suppression) per the Codice di Prevenzione Incendi rules on active protection (impianti di protezione attiva).',
    legalReference:  'Codice di Prevenzione Incendi (impianti di protezione attiva)',
    requiredDocument:'Installation certificate',
    mandatory:       true,
    sortOrder:       50,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'DATA_CENTER'],
    category:        'FIRE_SAFETY' as const,
    title:           'Periodic fire safety maintenance and CPI renewal',
    description:     'Ongoing periodic maintenance of fire-safety systems and renewal of the Certificato di Prevenzione Incendi (CPI) at the intervals set by the Vigili del Fuoco.',
    legalReference:  'D.P.R. 151/2011, ongoing obligation',
    requiredDocument:'Maintenance log',
    mandatory:       true,
    recurring:       true,
    recurrenceMonths:12,
    sortOrder:       60,
  },

  // ─── ELECTRICAL_SAFETY — any project with hasElectricalWorks = true ─────────
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER'],
    category:        'ELECTRICAL_SAFETY' as const,
    title:           'Designation of PES (Persona Esperta)',
    description:     'Written designation of the Experienced Person (PES) responsible for electrical work, as required by CEI 11-27 and Art. 82 of D.Lgs. 81/2008.',
    legalReference:  'Norma CEI 11-27; D.Lgs. 81/2008, Art. 82',
    triggerCondition:'hasElectricalWorks = true',
    requiredRole:    'PES',
    requiredDocument:'Written PES designation',
    mandatory:       true,
    sortOrder:       10,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER'],
    category:        'ELECTRICAL_SAFETY' as const,
    title:           'Designation of PAV (Persona Avvertita)',
    description:     'Written designation of the Instructed Person (PAV) who may carry out electrical work under supervision, per CEI 11-27.',
    legalReference:  'Norma CEI 11-27',
    triggerCondition:'hasElectricalWorks = true',
    requiredRole:    'PAV',
    requiredDocument:'Written PAV designation',
    mandatory:       false,
    sortOrder:       20,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER'],
    category:        'ELECTRICAL_SAFETY' as const,
    title:           'Designation of PEI (Persona Idonea — for live/"sotto tensione" work)',
    description:     'Written designation and Ministry authorization for the worker qualified to perform live electrical work (lavori sotto tensione). Required only when live work above 1000V AC / 1500V DC is planned.',
    legalReference:  'Norma CEI 11-27; D.M. 4 febbraio 2011; CEI 11-15',
    triggerCondition:'live work above 1000V planned',
    requiredRole:    'PEI',
    requiredDocument:'Written PEI designation + Ministry authorization',
    mandatory:       false,
    sortOrder:       30,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER'],
    category:        'ELECTRICAL_SAFETY' as const,
    title:           'Low-voltage installation design compliance (CEI 64-8)',
    description:     'Design and documentation of low-voltage electrical installations in compliance with CEI 64-8 (derived from IEC 60364).',
    legalReference:  'Norma CEI 64-8',
    triggerCondition:'hasElectricalWorks = true',
    requiredDocument:'Design documentation',
    mandatory:       true,
    sortOrder:       40,
  },
  {
    projectTypes:    ['ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER'],
    category:        'ELECTRICAL_SAFETY' as const,
    title:           'MV/HV installation design compliance (CEI EN 61936-1 / CEI EN 50522)',
    description:     'Design and documentation of medium and high-voltage electrical installations in compliance with CEI EN 61936-1 (CEI 99-2) and CEI EN 50522 (CEI 99-3) — applies to substations, switchgear rooms, and data-center power infrastructure.',
    legalReference:  'Norma CEI EN 61936-1 (CEI 99-2); CEI EN 50522 (CEI 99-3)',
    triggerCondition:'MV/HV equipment present',
    requiredDocument:'Design documentation',
    mandatory:       true,
    sortOrder:       50,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER'],
    category:        'ELECTRICAL_SAFETY' as const,
    title:           'Piano di lavoro / Piano di intervento (electrical work planning documents)',
    description:     'Work planning documents required by CEI 11-27 before every non-routine electrical operation — defines the scope, hazards, isolation points, and safe-execution procedure.',
    legalReference:  'Norma CEI 11-27',
    triggerCondition:'hasElectricalWorks = true',
    requiredDocument:'Work plan documents',
    mandatory:       true,
    sortOrder:       60,
  },
  {
    projectTypes:    ['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER'],
    category:        'ELECTRICAL_SAFETY' as const,
    title:           'Periodic verification of electrical installations and grounding system',
    description:     'Periodic safety verification of electrical installations and grounding/lightning protection systems by a qualified inspection body (ASL or accredited private body), as required by DPR 462/2001.',
    legalReference:  'D.P.R. 462/2001',
    triggerCondition:'hasElectricalWorks = true',
    requiredDocument:'Verification report',
    mandatory:       true,
    recurring:       true,
    recurrenceMonths:24,
    sortOrder:       70,
  },
]

async function main() {
  console.log('Seeding Italy safety requirements...')

  const country = await prisma.country.upsert({
    where:  { code: 'IT' },
    update: { name: 'Italy' },
    create: { code: 'IT', name: 'Italy' },
  })
  console.log(`Country: ${country.name} (${country.id})`)

  let created = 0
  let updated = 0

  for (const req of REQUIREMENTS) {
    const existing = await prisma.safetyRequirement.findFirst({
      where: { countryId: country.id, title: req.title },
    })

    const data = {
      projectTypes:     req.projectTypes,
      category:         req.category,
      description:      req.description,
      legalReference:   req.legalReference,
      triggerCondition: req.triggerCondition ?? null,
      requiredRole:     req.requiredRole ?? null,
      requiredDocument: req.requiredDocument ?? null,
      mandatory:        req.mandatory,
      recurring:        req.recurring ?? false,
      recurrenceMonths: req.recurrenceMonths ?? null,
      sortOrder:        req.sortOrder,
    }

    if (existing) {
      await prisma.safetyRequirement.update({
        where: { id: existing.id },
        data:  { ...data, active: true },
      })
      updated++
    } else {
      await prisma.safetyRequirement.create({
        data: { ...data, countryId: country.id, title: req.title },
      })
      created++
    }
  }

  console.log(`Done. Created: ${created}, Updated: ${updated}, Total: ${REQUIREMENTS.length}`)
  console.log('\n⚠️  Reminder: Have an Italian RSPP/CSP-CSE/fire-safety professional review')
  console.log('    these requirements and trigger thresholds before production use.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => void prisma.$disconnect())
