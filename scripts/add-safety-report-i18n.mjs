import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '..', 'messages')

const enBlock = {
  title: "Safety KPI Dashboard",
  subtitle: "Cross-site overview — DVR status, corrective actions, training, incidents",
  filters: {
    branch: "Branch",
    allBranches: "All Branches",
    period: "Period",
    allTime: "All Time",
    last30: "Last 30d",
    last90: "Last 90d",
    last6m: "Last 6m",
    last1y: "Last 1y",
    export: "Export PDF",
    exporting: "Exporting…"
  },
  stats: {
    totalSites: "Total Active Sites",
    dvrApproved: "DVR Approved",
    openActions: "Open Corrective Actions",
    openIncidents: "Open Incidents"
  },
  sections: {
    dvrStatus: "DVR Status Distribution",
    actionsByPriority: "Corrective Actions by Priority",
    training: "Training Record Status",
    incidentsByType: "Incidents by Type",
    trend: "Monthly Trend (Last 6 Months)",
    siteDetail: "Site-by-Site Summary"
  },
  table: {
    site: "Site",
    dvrStatus: "DVR Status",
    score: "Safety Score",
    actions: "Actions",
    incidents: "Incidents",
    training: "Training %",
    contractors: "Contractors"
  }
}

const translations = {
  'ar.json': {
    title: "لوحة مؤشرات السلامة",
    subtitle: "نظرة عامة على المواقع — حالة DVR، الإجراءات التصحيحية، التدريب، الحوادث",
    filters: { branch: "الفرع", allBranches: "جميع الفروع", period: "الفترة", allTime: "كل الأوقات", last30: "آخر 30 يوم", last90: "آخر 90 يوم", last6m: "آخر 6 أشهر", last1y: "آخر سنة", export: "تصدير PDF", exporting: "جارٍ التصدير…" },
    stats: { totalSites: "إجمالي المواقع النشطة", dvrApproved: "DVR معتمد", openActions: "إجراءات تصحيحية مفتوحة", openIncidents: "حوادث مفتوحة" },
    sections: { dvrStatus: "توزيع حالة DVR", actionsByPriority: "الإجراءات التصحيحية حسب الأولوية", training: "حالة سجلات التدريب", incidentsByType: "الحوادث حسب النوع", trend: "الاتجاه الشهري (آخر 6 أشهر)", siteDetail: "ملخص الموقع" },
    table: { site: "الموقع", dvrStatus: "حالة DVR", score: "درجة السلامة", actions: "الإجراءات", incidents: "الحوادث", training: "نسبة التدريب", contractors: "المقاولون" }
  },
  'it.json': {
    title: "Dashboard KPI Sicurezza",
    subtitle: "Panoramica multi-sito — stato DVR, azioni correttive, formazione, incidenti",
    filters: { branch: "Sede", allBranches: "Tutte le Sedi", period: "Periodo", allTime: "Tutto", last30: "Ultimi 30g", last90: "Ultimi 90g", last6m: "Ultimi 6m", last1y: "Ultimo anno", export: "Esporta PDF", exporting: "Esportazione…" },
    stats: { totalSites: "Siti Attivi", dvrApproved: "DVR Approvati", openActions: "Azioni Correttive Aperte", openIncidents: "Incidenti Aperti" },
    sections: { dvrStatus: "Distribuzione Stato DVR", actionsByPriority: "Azioni Correttive per Priorità", training: "Stato Formazione", incidentsByType: "Incidenti per Tipo", trend: "Andamento Mensile (Ultimi 6 Mesi)", siteDetail: "Riepilogo per Sito" },
    table: { site: "Sito", dvrStatus: "Stato DVR", score: "Punteggio Sicurezza", actions: "Azioni", incidents: "Incidenti", training: "% Formazione", contractors: "Appaltatori" }
  }
}

const locales = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'))

for (const locale of locales) {
  const filePath = path.join(messagesDir, locale)
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const data = JSON.parse(raw)

  if (!data.safetyDashboard) {
    const t = translations[locale]
    data.safetyDashboard = t ? { ...enBlock, ...t } : enBlock
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`✓ ${locale}`)
}

console.log('Done.')
