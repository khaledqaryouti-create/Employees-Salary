import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '..', 'messages')

const contractorsEn = {
  addContractor: "Add Contractor",
  editContractor: "Edit Contractor",
  addWorker: "Add Worker",
  editWorker: "Edit Worker",
  addPermit: "Add Permit",
  editPermit: "Edit Permit",
  listTitle: "Contractors",
  noContractors: "No contractors registered for this site.",
  noWorkers: "No workers recorded.",
  noPermits: "No access permits recorded.",
  noScope: "No scope defined",
  active: "Active",
  inactive: "Inactive",
  permitsExpiring: "permit(s) expiring soon",
  workersTitle: "Workers",
  permitsTitle: "Access Permits",
  status: "Status",
  loading: "Loading…",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  created: "Contractor created.",
  updated: "Contractor updated.",
  deleted: "Contractor deleted.",
  workerAdded: "Worker added.",
  workerUpdated: "Worker updated.",
  workerRemoved: "Worker removed.",
  permitCreated: "Permit created.",
  permitUpdated: "Permit updated.",
  permitDeleted: "Permit deleted.",
  saveError: "Failed to save. Please try again.",
  confirmDelete: "Delete this contractor and all their workers and permits?",
  confirmDeleteWorker: "Remove this worker?",
  confirmDeletePermit: "Delete this permit?",
  fields: {
    companyName: "Company Name",
    vatNumber: "VAT / Registration No.",
    contactName: "Contact Person",
    contactEmail: "Contact Email",
    contactPhone: "Contact Phone",
    workScope: "Work Scope",
    startDate: "Start Date",
    endDate: "End Date",
    isActive: "Active contractor",
    fullName: "Full Name",
    role: "Role",
    idNumber: "ID / Passport No.",
    inductionDate: "Induction Date",
    inductionValid: "Induction valid",
    certifications: "Certifications",
    certificationsPlaceholder: "e.g. CSCS, IOSH, First Aid",
    notes: "Notes",
    permitType: "Permit Type",
    permitNumber: "Permit Number",
    issuedDate: "Issued Date",
    expiryDate: "Expiry Date",
    workArea: "Work Area",
    conditions: "Special Conditions"
  },
  permitTypes: {
    GENERAL: "General",
    HOT_WORK: "Hot Work",
    CONFINED_SPACE: "Confined Space",
    ELECTRICAL: "Electrical",
    HEIGHT: "Working at Height",
    EXCAVATION: "Excavation"
  },
  stats: {
    total: "Total Contractors",
    active: "Active",
    workers: "Workers on Site",
    permits: "Total Permits"
  },
  validation: {
    nameRequired: "Name is required.",
    datesRequired: "Issued date and expiry date are required."
  }
}

// Translations for non-English locales (keep English as fallback)
const translations = {
  'ar.json': {
    addContractor: "إضافة مقاول", editContractor: "تعديل مقاول",
    addWorker: "إضافة عامل", editWorker: "تعديل عامل",
    addPermit: "إضافة تصريح", editPermit: "تعديل تصريح",
    listTitle: "المقاولون", noContractors: "لا يوجد مقاولون مسجلون لهذا الموقع.",
    noWorkers: "لا يوجد عمال مسجلون.", noPermits: "لا توجد تصاريح وصول مسجلة.",
    noScope: "لم يُحدد نطاق العمل", active: "نشط", inactive: "غير نشط",
    permitsExpiring: "تصريح(ات) تنتهي قريباً", workersTitle: "العمال",
    permitsTitle: "تصاريح الدخول", status: "الحالة", loading: "جارٍ التحميل…",
    save: "حفظ", saving: "جارٍ الحفظ…", cancel: "إلغاء",
    created: "تم إنشاء المقاول.", updated: "تم تحديث المقاول.", deleted: "تم حذف المقاول.",
    workerAdded: "تمت إضافة العامل.", workerUpdated: "تم تحديث العامل.", workerRemoved: "تمت إزالة العامل.",
    permitCreated: "تم إنشاء التصريح.", permitUpdated: "تم تحديث التصريح.", permitDeleted: "تم حذف التصريح.",
    saveError: "فشل الحفظ. يرجى المحاولة مرة أخرى.",
    confirmDelete: "هل تريد حذف هذا المقاول مع جميع عماله وتصاريحه؟",
    confirmDeleteWorker: "هل تريد إزالة هذا العامل؟",
    confirmDeletePermit: "هل تريد حذف هذا التصريح؟",
    fields: { companyName: "اسم الشركة", vatNumber: "رقم ضريبي / تسجيل", contactName: "جهة الاتصال", contactEmail: "البريد الإلكتروني للتواصل", contactPhone: "هاتف التواصل", workScope: "نطاق العمل", startDate: "تاريخ البدء", endDate: "تاريخ الانتهاء", isActive: "مقاول نشط", fullName: "الاسم الكامل", role: "الدور", idNumber: "رقم الهوية / جواز السفر", inductionDate: "تاريخ التعريف بالسلامة", inductionValid: "التعريف ساري", certifications: "الشهادات", certificationsPlaceholder: "مثال: CSCS, IOSH, إسعافات أولية", notes: "ملاحظات", permitType: "نوع التصريح", permitNumber: "رقم التصريح", issuedDate: "تاريخ الإصدار", expiryDate: "تاريخ الانتهاء", workArea: "منطقة العمل", conditions: "شروط خاصة" },
    permitTypes: { GENERAL: "عام", HOT_WORK: "أعمال ساخنة", CONFINED_SPACE: "فضاء محصور", ELECTRICAL: "أعمال كهربائية", HEIGHT: "العمل في الارتفاع", EXCAVATION: "حفر" },
    stats: { total: "إجمالي المقاولين", active: "نشط", workers: "عمال في الموقع", permits: "إجمالي التصاريح" },
    validation: { nameRequired: "الاسم مطلوب.", datesRequired: "تاريخ الإصدار وتاريخ الانتهاء مطلوبان." }
  },
  'it.json': {
    addContractor: "Aggiungi Appaltatore", editContractor: "Modifica Appaltatore",
    addWorker: "Aggiungi Lavoratore", editWorker: "Modifica Lavoratore",
    addPermit: "Aggiungi Permesso", editPermit: "Modifica Permesso",
    listTitle: "Appaltatori", noContractors: "Nessun appaltatore registrato per questo sito.",
    noWorkers: "Nessun lavoratore registrato.", noPermits: "Nessun permesso di accesso registrato.",
    noScope: "Nessun ambito definito", active: "Attivo", inactive: "Inattivo",
    permitsExpiring: "permesso/i in scadenza", workersTitle: "Lavoratori",
    permitsTitle: "Permessi di Accesso", status: "Stato", loading: "Caricamento…",
    save: "Salva", saving: "Salvataggio…", cancel: "Annulla",
    created: "Appaltatore creato.", updated: "Appaltatore aggiornato.", deleted: "Appaltatore eliminato.",
    workerAdded: "Lavoratore aggiunto.", workerUpdated: "Lavoratore aggiornato.", workerRemoved: "Lavoratore rimosso.",
    permitCreated: "Permesso creato.", permitUpdated: "Permesso aggiornato.", permitDeleted: "Permesso eliminato.",
    saveError: "Salvataggio fallito. Riprovare.",
    confirmDelete: "Eliminare questo appaltatore con tutti i lavoratori e i permessi?",
    confirmDeleteWorker: "Rimuovere questo lavoratore?",
    confirmDeletePermit: "Eliminare questo permesso?",
    fields: { companyName: "Ragione Sociale", vatNumber: "P.IVA / Codice Fiscale", contactName: "Referente", contactEmail: "Email Referente", contactPhone: "Telefono Referente", workScope: "Ambito Lavori", startDate: "Data Inizio", endDate: "Data Fine", isActive: "Appaltatore attivo", fullName: "Nome Completo", role: "Ruolo", idNumber: "Codice Fiscale / Passaporto", inductionDate: "Data Induction", inductionValid: "Induction valida", certifications: "Certificazioni", certificationsPlaceholder: "es. RSPP, RLS, Primo Soccorso", notes: "Note", permitType: "Tipo Permesso", permitNumber: "N. Permesso", issuedDate: "Data Emissione", expiryDate: "Data Scadenza", workArea: "Area di Lavoro", conditions: "Condizioni Speciali" },
    permitTypes: { GENERAL: "Generale", HOT_WORK: "Lavori a Caldo", CONFINED_SPACE: "Spazi Confinati", ELECTRICAL: "Lavori Elettrici", HEIGHT: "Lavori in Quota", EXCAVATION: "Scavi" },
    stats: { total: "Totale Appaltatori", active: "Attivi", workers: "Lavoratori in Sito", permits: "Totale Permessi" },
    validation: { nameRequired: "Il nome è obbligatorio.", datesRequired: "Le date di emissione e scadenza sono obbligatorie." }
  }
}

const locales = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'))

for (const locale of locales) {
  const filePath = path.join(messagesDir, locale)
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const data = JSON.parse(raw)

  // Add contractors tab key in sites.tabs
  if (data.sites?.tabs && !data.sites.tabs.contractors) {
    data.sites.tabs.contractors = locale === 'it.json' ? 'Appaltatori'
      : locale === 'ar.json' ? 'المقاولون'
      : 'Contractors'
  }

  // Add contractors root key
  if (!data.contractors) {
    const t = translations[locale]
    data.contractors = t ? { ...contractorsEn, ...t } : contractorsEn
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`✓ ${locale}`)
}

console.log('Done.')
