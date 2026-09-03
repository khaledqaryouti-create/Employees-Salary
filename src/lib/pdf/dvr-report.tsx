import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Colour tokens ────────────────────────────────────────────────────────────

const C = {
  navy:       '#0d3b6e',
  navyMid:    '#1e4d8c',
  navyLight:  '#e8f0fe',
  white:      '#ffffff',
  black:      '#0f172a',
  gray900:    '#111827',
  gray700:    '#374151',
  gray500:    '#6b7280',
  gray300:    '#d1d5db',
  gray100:    '#f3f4f6',
  gray50:     '#f9fafb',
  highBg:     '#fee2e2',
  highText:   '#991b1b',
  highBorder: '#fca5a5',
  medBg:      '#fef3c7',
  medText:    '#92400e',
  medBorder:  '#fcd34d',
  lowBg:      '#d1fae5',
  lowText:    '#065f46',
  lowBorder:  '#6ee7b7',
  accent:     '#1d4ed8',
  accentLight:'#dbeafe',
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Pages ──────────────────────────────────────────────────────────────────
  page: {
    fontFamily:      'Helvetica',
    fontSize:        8.5,
    color:           C.gray700,
    backgroundColor: C.white,
  },
  pagePortrait: {
    fontFamily:      'Helvetica',
    fontSize:        8.5,
    color:           C.gray700,
    backgroundColor: C.white,
    paddingBottom:   40,
  },
  pageLandscape: {
    fontFamily:      'Helvetica',
    fontSize:        7.5,
    color:           C.gray700,
    backgroundColor: C.white,
    paddingBottom:   40,
  },
  body: {
    paddingHorizontal: 36,
    paddingTop:        24,
  },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverHeader: {
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingTop:      48,
    paddingBottom:   40,
  },
  coverEyebrow: {
    fontSize:     8,
    color:        '#93c5fd',
    fontFamily:   'Helvetica',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  coverTitle: {
    fontSize:     26,
    fontFamily:   'Helvetica-Bold',
    color:        C.white,
    marginBottom: 6,
    lineHeight:   1.2,
  },
  coverSubtitle: {
    fontSize:   11,
    color:      '#bfdbfe',
    fontFamily: 'Helvetica',
    marginBottom: 4,
  },
  coverRule: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    marginTop:  20,
    marginBottom: 0,
    width:       60,
  },

  // cover — document control table
  coverDocTable: {
    flexDirection:   'row',
    marginHorizontal: 36,
    marginTop:       24,
    borderWidth:     1,
    borderColor:     C.gray300,
    borderRadius:    4,
  },
  coverDocCell: {
    flex:    1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: C.gray300,
  },
  coverDocCellLast: {
    flex:    1,
    padding: 10,
  },
  coverDocLabel: {
    fontSize:     6.5,
    color:        C.gray500,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  coverDocValue: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      C.gray900,
  },

  // cover — personnel panel
  coverPersonnelRow: {
    flexDirection:   'row',
    marginHorizontal: 36,
    marginTop:       16,
    gap:             12,
  },
  coverPersonnelBox: {
    flex:            1,
    backgroundColor: C.navyLight,
    borderRadius:    4,
    padding:         10,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
  },
  coverPersonnelLabel: {
    fontSize:     6.5,
    color:        C.accent,
    fontFamily:   'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  coverPersonnelName: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      C.gray900,
  },

  // cover — footer strip
  coverFooter: {
    position:  'absolute',
    bottom:    0,
    left:      0,
    right:     0,
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverFooterText: {
    fontSize: 7,
    color:    '#93c5fd',
  },
  coverConfidential: {
    marginHorizontal: 36,
    marginTop:        20,
    paddingHorizontal: 12,
    paddingVertical:   8,
    backgroundColor:  '#fff7ed',
    borderLeftWidth:  3,
    borderLeftColor:  '#f59e0b',
    borderRadius:     2,
  },
  coverConfidentialText: {
    fontSize:  7,
    color:     '#92400e',
    lineHeight: 1.5,
  },

  // ── Table of contents ──────────────────────────────────────────────────────
  tocTitle: {
    fontSize:     18,
    fontFamily:   'Helvetica-Bold',
    color:        C.navy,
    marginBottom: 20,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    marginBottom:  10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  tocNum: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      C.navy,
    width:      18,
  },
  tocLabel: {
    fontSize:  9,
    color:     C.gray700,
    flex:      1,
  },
  tocDots: {
    fontSize:  8,
    color:     C.gray300,
    flex:      1,
    textAlign: 'right',
  },

  // ── Section header (used on content pages) ─────────────────────────────────
  sectionBand: {
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingVertical:   10,
    flexDirection:     'row',
    alignItems:        'center',
    marginBottom:      0,
  },
  sectionNum: {
    fontSize:     9,
    color:        '#93c5fd',
    fontFamily:   'Helvetica-Bold',
    marginRight:  8,
  },
  sectionTitle: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    color:      C.white,
  },

  // ── Field cards (Sections 1 & 2) ───────────────────────────────────────────
  fieldGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginBottom:  12,
  },
  fieldCard: {
    width:           '48%',
    backgroundColor: C.gray50,
    borderWidth:     1,
    borderColor:     C.gray300,
    borderRadius:    3,
    padding:         8,
  },
  fieldCardWide: {
    width:           '100%',
    backgroundColor: C.gray50,
    borderWidth:     1,
    borderColor:     C.gray300,
    borderRadius:    3,
    padding:         8,
  },
  fieldLabel: {
    fontSize:     6.5,
    color:        C.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  fieldValue: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      C.gray900,
  },
  groupLabel: {
    fontSize:     7,
    fontFamily:   'Helvetica-Bold',
    color:        C.navyMid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  6,
    marginTop:     12,
    paddingBottom:  3,
    borderBottomWidth: 1,
    borderBottomColor: C.navyLight,
  },

  // ── Tables ─────────────────────────────────────────────────────────────────
  table: {
    borderWidth:  1,
    borderColor:  C.gray300,
    borderRadius: 3,
    marginBottom: 12,
    overflow:     'hidden',
  },
  tableHeader: {
    flexDirection:   'row',
    backgroundColor: C.navy,
  },
  tableRow: {
    flexDirection:     'row',
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  tableRowAlt: {
    flexDirection:     'row',
    backgroundColor:   C.gray50,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  th: {
    padding:    6,
    fontSize:   7,
    fontFamily: 'Helvetica-Bold',
    color:      C.white,
  },
  td: {
    padding:  5,
    fontSize: 8,
    color:    C.gray700,
  },
  tdBold: {
    padding:    5,
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      C.gray900,
  },

  // ── Risk badges ────────────────────────────────────────────────────────────
  badgeLow: {
    backgroundColor: C.lowBg,
    color:           C.lowText,
    paddingHorizontal: 5,
    paddingVertical:   2,
    borderRadius:    3,
    fontSize:        7,
    fontFamily:      'Helvetica-Bold',
  },
  badgeMedium: {
    backgroundColor: C.medBg,
    color:           C.medText,
    paddingHorizontal: 5,
    paddingVertical:   2,
    borderRadius:    3,
    fontSize:        7,
    fontFamily:      'Helvetica-Bold',
  },
  badgeHigh: {
    backgroundColor: C.highBg,
    color:           C.highText,
    paddingHorizontal: 5,
    paddingVertical:   2,
    borderRadius:    3,
    fontSize:        7,
    fontFamily:      'Helvetica-Bold',
  },

  // ── Risk matrix extras ─────────────────────────────────────────────────────
  statBar: {
    flexDirection:   'row',
    gap:             8,
    marginHorizontal: 36,
    marginTop:       16,
    marginBottom:    12,
  },
  statCard: {
    flex:         1,
    borderWidth:  1,
    borderRadius: 4,
    padding:      10,
    alignItems:   'center',
  },
  statNum: {
    fontSize:   16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  processGroupRow: {
    flexDirection:   'row',
    backgroundColor: C.navy,
    paddingVertical:  4,
    paddingHorizontal: 6,
  },
  processGroupText: {
    fontSize:   7.5,
    fontFamily: 'Helvetica-Bold',
    color:      C.white,
  },
  activityGroupRow: {
    flexDirection:   'row',
    backgroundColor: C.navyLight,
    paddingVertical:  3,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.gray300,
  },
  activityGroupText: {
    fontSize:   7,
    fontFamily: 'Helvetica-Bold',
    color:      C.navyMid,
  },
  riskLegend: {
    fontSize:     7,
    color:        C.gray500,
    marginHorizontal: 36,
    marginBottom: 8,
    lineHeight:   1.5,
  },

  // ── Worker-group cards ─────────────────────────────────────────────────────
  wgCard: {
    borderWidth:  1,
    borderColor:  C.gray300,
    borderRadius: 4,
    marginBottom: 10,
    overflow:     'hidden',
  },
  wgCardHeader: {
    backgroundColor: C.navyLight,
    paddingHorizontal: 10,
    paddingVertical:   6,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
  },
  wgCode: {
    fontSize:     8,
    fontFamily:   'Helvetica-Bold',
    color:        C.navy,
    backgroundColor: C.white,
    borderWidth:  1,
    borderColor:  C.navy,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  wgName: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      C.navy,
  },
  wgDesc: {
    fontSize:  7,
    color:     C.gray500,
    paddingHorizontal: 10,
    paddingVertical:   4,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },

  // ── Equipment extras ───────────────────────────────────────────────────────
  overdueRow: {
    flexDirection:     'row',
    backgroundColor:   '#fff1f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecdd3',
    borderLeftWidth:   3,
    borderLeftColor:   C.highText,
  },

  // ── Signature block ────────────────────────────────────────────────────────
  sigSection: {
    marginHorizontal: 36,
    marginTop:        20,
  },
  sigIntro: {
    fontSize:   8,
    color:      C.gray700,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  sigRow: {
    flexDirection: 'row',
    gap:           16,
    marginBottom:  20,
  },
  sigBox: {
    flex:          1,
    borderWidth:   1,
    borderColor:   C.gray300,
    borderRadius:  4,
    overflow:      'hidden',
  },
  sigBoxHead: {
    backgroundColor: C.navy,
    paddingHorizontal: 10,
    paddingVertical:   6,
  },
  sigBoxRole: {
    fontSize:   7.5,
    fontFamily: 'Helvetica-Bold',
    color:      C.white,
  },
  sigBoxBody: {
    padding: 10,
  },
  sigName: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      C.gray900,
    marginBottom: 16,
  },
  sigFieldLabel: {
    fontSize:     6.5,
    color:        C.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  2,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: C.gray300,
    marginBottom:      10,
    height:            22,
  },
  sigLegal: {
    marginHorizontal: 36,
    marginTop:        24,
    padding:          10,
    backgroundColor:  C.gray50,
    borderWidth:      1,
    borderColor:      C.gray300,
    borderRadius:     3,
  },
  sigLegalTitle: {
    fontSize:   7.5,
    fontFamily: 'Helvetica-Bold',
    color:      C.navy,
    marginBottom: 4,
  },
  sigLegalText: {
    fontSize:  7,
    color:     C.gray500,
    lineHeight: 1.5,
  },

  // ── Footer (fixed on every page) ───────────────────────────────────────────
  footer: {
    position:  'absolute',
    bottom:    0,
    left:      0,
    right:     0,
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingVertical:   5,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  footerLeft: {
    fontSize: 6.5,
    color:    '#93c5fd',
  },
  footerRight: {
    fontSize: 6.5,
    color:    C.white,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  disclaimer: {
    marginHorizontal: 36,
    marginTop:        12,
    fontSize:         7,
    color:            C.gray500,
    lineHeight:       1.5,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface HazardRowProps {
  h: DvrHazardScreening
  alt: boolean
}

function HazardRow({ h, alt }: HazardRowProps) {
  return (
    <View
      key={`${h.hazardCode}-${h.processName}-${h.activityName}-${h.taskName}`}
      style={alt ? s.tableRowAlt : s.tableRow}
      wrap={false}
    >
      <Text style={[s.tdBold, { width: '6%'  }]}>{h.hazardCode}</Text>
      <Text style={[s.td,     { width: '20%' }]}>{HAZARD_LABELS[h.hazardCode] ?? h.hazardCode}</Text>
      <Text style={[s.td,     { width: '5%'  }]}>{h.probability ?? '—'}</Text>
      <Text style={[s.td,     { width: '5%'  }]}>{h.damage ?? '—'}</Text>
      <Text style={[s.td,     { width: '5%'  }]}>{h.riskLevel ?? '—'}</Text>
      <View style={{ width: '8%', padding: 5, justifyContent: 'center' }}>
        <RiskBadge riskClass={h.riskClass} />
      </View>
      <Text style={[s.td,     { width: '23%' }]}>{h.mitigationMeasures ?? '—'}</Text>
      <Text style={[s.td,     { width: '5%'  }]}>{h.residualProbability ?? '—'}</Text>
      <Text style={[s.td,     { width: '5%'  }]}>{h.residualDamage ?? '—'}</Text>
      <Text style={[s.td,     { width: '5%'  }]}>{h.residualRiskLevel ?? '—'}</Text>
      <View style={{ width: '8%', padding: 5, justifyContent: 'center' }}>
        <RiskBadge riskClass={h.residualRiskClass} />
      </View>
    </View>
  )
}

interface TaskGroupProps {
  processName:  string
  activityName: string
  taskName:     string
  rows:         DvrHazardScreening[]
  showHeader:   boolean
}

function TaskGroup({ processName, activityName, taskName, rows, showHeader }: TaskGroupProps) {
  return (
    <View key={`${processName}-${activityName}-${taskName}`}>
      <View style={{
        flexDirection:   'row',
        backgroundColor: C.navyLight,
        paddingVertical:  3,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: C.gray300,
      }} wrap={false}>
        <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.navyMid, width: '100%' }}>
          {showHeader ? `Process: ${processName}  /  Activity: ${activityName}  /  ` : ''}Task: {taskName}
        </Text>
      </View>
      {rows.map((h, hi) => (
        <HazardRow
          key={`${h.hazardCode}-${h.processName}-${h.activityName}-${h.taskName}`}
          h={h}
          alt={hi % 2 !== 0}
        />
      ))}
    </View>
  )
}

function RiskBadge({ riskClass }: { riskClass: string | null }) {
  if (!riskClass) return <Text style={s.td}>—</Text>
  const style =
    riskClass === 'LOW'    ? s.badgeLow :
    riskClass === 'MEDIUM' ? s.badgeMedium :
    s.badgeHigh
  return <Text style={style}>{riskClass}</Text>
}

function Footer({ siteName, docNum, version }: { siteName: string; docNum: string; version: number }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerLeft}>{siteName} — DVR {docNum} v{version}</Text>
      <Text
        style={s.footerRight}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

function SectionBand({ num, title }: { num: string; title: string }) {
  return (
    <View style={s.sectionBand}>
      <Text style={s.sectionNum}>{num}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

function FieldCard({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <View style={wide ? s.fieldCardWide : s.fieldCard}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value ?? '—'}</Text>
    </View>
  )
}

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
  R11: 'Extreme temperatures (heat/cold)',
  R12: 'Electrical hazards',
  R13: 'Fire and explosion',
  R14: 'Radiation (ionising / non-ionising)',
  R15: 'Confined spaces',
  R16: 'Ergonomic hazards (repetitive strain)',
  R17: 'Psychosocial hazards',
  R18: 'Work at height / scaffolding',
  R19: 'Driving and transport risk',
  R20: 'Contractor and third-party interaction',
  R21: 'Environmental hazards (dust, fumes)',
  R22: 'Emergency situations / natural hazards',
}

const ROLE_LABELS: Record<string, string> = {
  EMPLOYER:          'Employer (Datore di Lavoro)',
  RSPP:              'RSPP',
  ASPP:              'ASPP',
  RLS:               'RLS',
  RLST:              'RLST',
  MEDICO_COMPETENTE: 'Occupational Physician (Medico Competente)',
  MANAGER:           'Manager',
  SUPERVISOR:        'Supervisor',
  FIRST_AID:         'First Aid (Addetto Pronto Soccorso)',
  FIRE_EMERGENCY:    'Fire & Emergency (Addetto Antincendio)',
}

// ─── Data interfaces ──────────────────────────────────────────────────────────

export interface DvrSafetyRole {
  roleType:     string
  employeeName: string | null
  externalName: string | null
  expiryDate:   string | null
}

export interface DvrWorkerGroupMember {
  fullName: string
  jobTitle: string | null
}

export interface DvrWorkerGroup {
  code:        string
  name:        string
  description: string | null
  members:     DvrWorkerGroupMember[]
}

export interface DvrEquipment {
  name:               string
  category:           string
  serialNumber:       string | null
  nextInspectionDate: string | null
}

export interface DvrHazardScreening {
  hazardCode:          string
  justification:       string | null
  processName:         string
  activityName:        string
  taskName:            string
  probability:         number | null
  damage:              number | null
  riskLevel:           number | null
  riskClass:           string | null
  mitigationMeasures:  string | null
  residualProbability: number | null
  residualDamage:      number | null
  residualRiskLevel:   number | null
  residualRiskClass:   string | null
}

export interface DvrTrainingRecord {
  id:            string
  trainingType:  string
  trainerName:   string | null
  trainingDate:  string
  expiryDate:    string | null
  certificateRef: string | null
  status:        string
  workerGroupName: string | null
  workerGroupCode: string | null
}

export interface DvrCorrectiveAction {
  id:           string
  title:        string
  description:  string | null
  priority:     string
  status:       string
  assigneeName: string | null
  dueDate:      string | null
  hazardCode:   string | null
  taskName:     string | null
}

export interface DvrIncident {
  id:            string
  incidentType:  string
  severity:      string
  status:        string
  incidentDate:  string
  title:         string
  location:      string | null
}

export interface DvrReportProps {
  // Site info
  siteName:         string
  legalEntityName:  string | null
  vatNumber:        string | null
  taxCode:          string | null
  atecoCode:        string | null
  atecoDescription: string | null
  address:          string | null
  city:             string | null
  siteCountry:      string | null
  workingHours:     string | null
  shiftPattern:     string | null
  // DVR meta
  documentNumber:  string | null
  version:         number
  assessmentDate:  string | null
  nextReviewDate:  string | null
  // Organization
  organizationName: string
  // Section data
  safetyRoles:        DvrSafetyRole[]
  workerGroups:       DvrWorkerGroup[]
  equipment:          DvrEquipment[]
  hazards:            DvrHazardScreening[]
  correctiveActions?:  DvrCorrectiveAction[]
  trainingRecords?:    DvrTrainingRecord[]
  incidents?:          DvrIncident[]
  approvalSignatures?: { roleType: string; signerName: string; signedAt: string }[]
  // Footer
  generatedDate: string
}

// ─── Corrective action row helper ────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#16a34a' }
const STATUS_COLOR:   Record<string, string> = { OPEN: '#1d4ed8', IN_PROGRESS: '#92400e', COMPLETED: '#065f46', OVERDUE: '#991b1b', CANCELLED: '#4b5563' }

function ActionRow({ action, alt }: { action: DvrCorrectiveAction; alt: boolean }) {
  const bg = alt ? '#f8fafc' : '#ffffff'
  return (
    <View style={{ flexDirection: 'row', backgroundColor: bg, borderTop: '1pt solid #e2e8f0', padding: 5 }}>
      <View style={{ flex: 3, paddingRight: 4 }}>
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>{action.title}</Text>
        {action.hazardCode ? (
          <Text style={{ fontSize: 6.5, color: '#64748b', marginTop: 1 }}>
            {action.hazardCode}{action.taskName ? ` — ${action.taskName}` : ''}
          </Text>
        ) : null}
        {action.description ? (
          <Text style={{ fontSize: 6.5, color: '#475569', marginTop: 1 }}>{action.description}</Text>
        ) : null}
      </View>
      <Text style={{ flex: 1, fontSize: 7, color: PRIORITY_COLOR[action.priority] ?? '#374151', fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 2 }}>
        {action.priority}
      </Text>
      <Text style={{ flex: 1, fontSize: 7, color: STATUS_COLOR[action.status] ?? '#374151', fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 2 }}>
        {action.status.replace('_', ' ')}
      </Text>
      <Text style={{ flex: 2, fontSize: 7, color: '#374151', paddingTop: 2 }}>
        {action.assigneeName ?? '—'}
      </Text>
      <Text style={{ flex: 1, fontSize: 7, color: '#374151', textAlign: 'center', paddingTop: 2 }}>
        {action.dueDate ? action.dueDate.slice(0, 10) : '—'}
      </Text>
    </View>
  )
}

// ─── Incident row helper ──────────────────────────────────────────────────────

const SEVERITY_COLOR_MAP: Record<string, string> = {
  FATAL:         '#7f1d1d',
  MAJOR:         '#dc2626',
  MINOR:         '#ea580c',
  FIRST_AID_ONLY:'#ca8a04',
  NO_INJURY:     '#15803d',
}

const TYPE_LABEL_MAP: Record<string, string> = {
  ACCIDENT:             'Accident',
  NEAR_MISS:            'Near Miss',
  DANGEROUS_OCCURRENCE: 'Dangerous Occ.',
  OCCUPATIONAL_DISEASE: 'Occ. Disease',
}

const INCIDENT_STATUS_LABEL: Record<string, string> = {
  REPORTED:                   'Reported',
  UNDER_INVESTIGATION:        'Investigating',
  CORRECTIVE_ACTIONS_ASSIGNED:'Actions Assigned',
  CLOSED:                     'Closed',
}

function IncidentRow({ incident, idx }: { incident: DvrIncident; idx: number }) {
  const alt           = idx % 2 !== 0
  const bg            = alt ? '#fff5f5' : '#ffffff'
  const severityColor = SEVERITY_COLOR_MAP[incident.severity] ?? '#374151'
  const typeLabel     = TYPE_LABEL_MAP[incident.incidentType] ?? incident.incidentType
  const statusLabel   = INCIDENT_STATUS_LABEL[incident.status] ?? incident.status
  return (
    <View style={{ flexDirection: 'row', backgroundColor: bg, padding: '5 6', borderTop: idx === 0 ? 0 : '0.5pt solid #fecaca' }}>
      <Text style={{ flex: 1.2, fontSize: 7, color: '#374151' }}>{incident.incidentDate.slice(0, 10)}</Text>
      <Text style={{ flex: 1.5, fontSize: 7, color: '#374151' }}>{typeLabel}</Text>
      <Text style={{ flex: 1.2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: severityColor }}>{incident.severity.replace('_', ' ')}</Text>
      <Text style={{ flex: 4, fontSize: 7, color: '#1e293b' }}>{incident.title}</Text>
      <Text style={{ flex: 2, fontSize: 7, color: '#475569' }}>{incident.location ?? '—'}</Text>
      <Text style={{ flex: 1.5, fontSize: 6.5, color: '#374151', textAlign: 'center' }}>{statusLabel}</Text>
    </View>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DvrReport(props: DvrReportProps) {
  const {
    siteName, legalEntityName, vatNumber, taxCode, atecoCode, atecoDescription,
    address, city, siteCountry, workingHours, shiftPattern,
    documentNumber, version, assessmentDate, nextReviewDate,
    organizationName,
    safetyRoles, workerGroups, equipment, hazards,
    correctiveActions   = [],
    trainingRecords     = [],
    incidents           = [],
    approvalSignatures  = [],
    generatedDate,
  } = props

  const docNum = documentNumber ?? 'DVR-001'
  const today  = generatedDate

  const rspp     = safetyRoles.find((r) => r.roleType === 'RSPP')
  const employer = safetyRoles.find((r) => r.roleType === 'EMPLOYER')
  const rls      = safetyRoles.find((r) => r.roleType === 'RLS' || r.roleType === 'RLST')

  const rsppName     = rspp?.employeeName     ?? rspp?.externalName     ?? '—'
  const employerName = employer?.employeeName ?? employer?.externalName ?? '—'
  const rlsName      = rls?.employeeName      ?? rls?.externalName      ?? '—'

  // Risk summary counts
  const totalHazards  = hazards.length
  const highCount     = hazards.filter((h) => h.riskClass === 'HIGH').length
  const mediumCount   = hazards.filter((h) => h.riskClass === 'MEDIUM').length
  const lowCount      = hazards.filter((h) => h.riskClass === 'LOW').length

  // Group hazards by process → activity → task
  const grouped = new Map<string, Map<string, Map<string, DvrHazardScreening[]>>>()
  for (const h of hazards) {
    if (!grouped.has(h.processName)) grouped.set(h.processName, new Map())
    const pMap = grouped.get(h.processName)!
    if (!pMap.has(h.activityName)) pMap.set(h.activityName, new Map())
    const aMap = pMap.get(h.activityName)!
    if (!aMap.has(h.taskName)) aMap.set(h.taskName, [])
    aMap.get(h.taskName)!.push(h)
  }

  // Equipment: mark overdue
  const nowDate = new Date()
  function isOverdue(dateStr: string | null): boolean {
    if (!dateStr || dateStr === '—') return false
    return new Date(dateStr) < nowDate
  }

  return (
    <Document title={`DVR — ${siteName}`} author={organizationName}>

      {/* ══════════════════════════════════════════════════════
          PAGE 1 — COVER
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>

        {/* Full-bleed navy header */}
        <View style={s.coverHeader}>
          <Text style={s.coverEyebrow}>DOCUMENTO DI VALUTAZIONE DEI RISCHI</Text>
          <Text style={s.coverTitle}>Risk Assessment{'\n'}Document</Text>
          <Text style={s.coverSubtitle}>D.Lgs. 81/2008 — Testo Unico sulla Sicurezza sul Lavoro</Text>
          <View style={s.coverRule} />
        </View>

        {/* Document control table */}
        <View style={s.coverDocTable}>
          <View style={s.coverDocCell}>
            <Text style={s.coverDocLabel}>Site / Workplace</Text>
            <Text style={s.coverDocValue}>{siteName}</Text>
          </View>
          <View style={s.coverDocCell}>
            <Text style={s.coverDocLabel}>Organization</Text>
            <Text style={s.coverDocValue}>{organizationName}</Text>
          </View>
          <View style={s.coverDocCell}>
            <Text style={s.coverDocLabel}>Document No.</Text>
            <Text style={s.coverDocValue}>{docNum}</Text>
          </View>
          <View style={s.coverDocCellLast}>
            <Text style={s.coverDocLabel}>Version</Text>
            <Text style={s.coverDocValue}>{version}</Text>
          </View>
        </View>

        <View style={[s.coverDocTable, { marginTop: 8 }]}>
          <View style={s.coverDocCell}>
            <Text style={s.coverDocLabel}>Assessment Date</Text>
            <Text style={s.coverDocValue}>{assessmentDate ?? 'To be confirmed'}</Text>
          </View>
          <View style={s.coverDocCell}>
            <Text style={s.coverDocLabel}>Next Review Date</Text>
            <Text style={s.coverDocValue}>{nextReviewDate ?? 'To be confirmed'}</Text>
          </View>
          <View style={s.coverDocCell}>
            <Text style={s.coverDocLabel}>Total Hazards Assessed</Text>
            <Text style={s.coverDocValue}>{totalHazards}</Text>
          </View>
          <View style={s.coverDocCellLast}>
            <Text style={s.coverDocLabel}>Generated On</Text>
            <Text style={s.coverDocValue}>{today}</Text>
          </View>
        </View>

        {/* Key personnel */}
        <View style={s.coverPersonnelRow}>
          <View style={s.coverPersonnelBox}>
            <Text style={s.coverPersonnelLabel}>Employer — Datore di Lavoro</Text>
            <Text style={s.coverPersonnelName}>{employerName}</Text>
          </View>
          <View style={s.coverPersonnelBox}>
            <Text style={s.coverPersonnelLabel}>RSPP — Safety Manager</Text>
            <Text style={s.coverPersonnelName}>{rsppName}</Text>
          </View>
          <View style={s.coverPersonnelBox}>
            <Text style={s.coverPersonnelLabel}>RLS / RLST — Worker Representative</Text>
            <Text style={s.coverPersonnelName}>{rlsName}</Text>
          </View>
        </View>

        {/* Confidentiality / disclaimer */}
        <View style={s.coverConfidential}>
          <Text style={s.coverConfidentialText}>
            CONFIDENTIAL — This document is intended solely for use by the organisation named above and the competent
            authorities. It has been generated automatically from the HR &amp; Safety management system and requires
            review and written approval by the Employer and RSPP before acquiring legal validity under D.Lgs. 81/2008.
            It does not substitute for professional legal or safety advice.
          </Text>
        </View>

        {/* Cover footer strip */}
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>{organizationName} — {siteName}</Text>
          <Text style={s.coverFooterText}>DVR {docNum}  |  Version {version}  |  {today}</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 2 — TABLE OF CONTENTS
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.pagePortrait}>
        <SectionBand num="" title="Table of Contents" />
        <View style={s.body}>
          <Text style={s.tocTitle}>Contents</Text>

          {[
            { num: '1', title: 'Company and Workplace Information' },
            { num: '2', title: 'Safety Organization' },
            { num: '3', title: 'Homogeneous Worker Groups' },
            { num: '4', title: 'Equipment Register  (Art. 71 D.Lgs. 81/2008)' },
            { num: '5', title: 'Hazard Identification and Risk Assessment Matrix  (P × D = R)' },
            { num: '6', title: 'Signatures and Approval' },
          ].map((item) => (
            <View key={item.num} style={s.tocRow}>
              <Text style={s.tocNum}>{item.num}</Text>
              <Text style={s.tocLabel}>{item.title}</Text>
            </View>
          ))}

          {/* Summary stats box */}
          <View style={{
            marginTop: 32,
            borderWidth: 1,
            borderColor: C.gray300,
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: C.navy, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white }}>
                Document Summary
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {[
                { label: 'Total hazards', value: String(totalHazards), bg: C.white, color: C.gray900, last: false },
                { label: 'HIGH risk', value: String(highCount), bg: C.highBg, color: C.highText, last: false },
                { label: 'MEDIUM risk', value: String(mediumCount), bg: C.medBg, color: C.medText, last: false },
                { label: 'LOW risk', value: String(lowCount), bg: C.lowBg, color: C.lowText, last: false },
                { label: 'Worker groups', value: String(workerGroups.length), bg: C.accentLight, color: C.accent, last: false },
                { label: 'Safety roles', value: String(safetyRoles.length), bg: C.white, color: C.gray900, last: true },
              ].map((stat) => (
                <View key={stat.label} style={{
                  flex: 1,
                  backgroundColor: stat.bg,
                  padding: 10,
                  alignItems: 'center',
                  borderRightWidth: stat.last ? 0 : 1,
                  borderRightColor: C.gray300,
                  borderTopWidth: 1,
                  borderTopColor: C.gray300,
                }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: stat.color, marginBottom: 2 }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 6.5, color: stat.color, textAlign: 'center' }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <Footer siteName={siteName} docNum={docNum} version={version} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 3 — SECTION 1: COMPANY & WORKPLACE
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.pagePortrait}>
        <SectionBand num="1" title="Company and Workplace Information" />
        <View style={s.body}>

          <Text style={s.groupLabel}>Legal Identity</Text>
          <View style={s.fieldGrid}>
            <FieldCard label="Legal Entity / Company Name" value={legalEntityName} />
            <FieldCard label="VAT Number (Partita IVA)" value={vatNumber} />
            <FieldCard label="Tax Code (Codice Fiscale)" value={taxCode} />
            <FieldCard label="ATECO Code" value={atecoCode} />
          </View>

          <Text style={s.groupLabel}>Business Activity</Text>
          <View style={s.fieldGrid}>
            <FieldCard label="Business Activity Description" value={atecoDescription} wide />
          </View>

          <Text style={s.groupLabel}>Workplace Location</Text>
          <View style={s.fieldGrid}>
            <FieldCard label="Address" value={address} />
            <FieldCard label="City" value={city} />
            <FieldCard label="Country" value={siteCountry} />
          </View>

          <Text style={s.groupLabel}>Operations</Text>
          <View style={s.fieldGrid}>
            <FieldCard label="Working Hours" value={workingHours} />
            <FieldCard label="Shift Pattern" value={shiftPattern} />
          </View>

        </View>
        <Footer siteName={siteName} docNum={docNum} version={version} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 4 — SECTION 2: SAFETY ORGANIZATION
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.pagePortrait}>
        <SectionBand num="2" title="Safety Organization" />
        <View style={s.body}>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '36%' }]}>Role</Text>
              <Text style={[s.th, { width: '36%' }]}>Name / Appointee</Text>
              <Text style={[s.th, { width: '16%' }]}>Appointment Date</Text>
              <Text style={[s.th, { width: '12%' }]}>Expiry</Text>
            </View>
            {safetyRoles.map((role, i) => {
              const name = role.employeeName ?? role.externalName ?? '—'
              return (
                <View key={role.roleType} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
                  <Text style={[s.tdBold, { width: '36%' }]}>{ROLE_LABELS[role.roleType] ?? role.roleType}</Text>
                  <Text style={[s.td,     { width: '36%' }]}>{name}</Text>
                  <Text style={[s.td,     { width: '16%' }]}>—</Text>
                  <Text style={[s.td,     { width: '12%' }]}>{role.expiryDate ?? 'No expiry'}</Text>
                </View>
              )
            })}
            {safetyRoles.length === 0 && (
              <View style={s.tableRow}>
                <Text style={[s.td, { width: '100%' }]}>No safety roles recorded.</Text>
              </View>
            )}
          </View>

          {/* Note on Italian mandatory roles */}
          <View style={{
            backgroundColor: C.accentLight,
            borderLeftWidth: 3,
            borderLeftColor: C.accent,
            borderRadius:    2,
            padding:         8,
            marginTop:       4,
          }}>
            <Text style={{ fontSize: 7, color: C.accent, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
              Mandatory Roles (D.Lgs. 81/2008 Art. 17–18)
            </Text>
            <Text style={{ fontSize: 7, color: C.gray700, lineHeight: 1.5 }}>
              The Employer (Datore di Lavoro) and RSPP appointments are non-delegable duties required by Italian
              occupational safety law. The RLS/RLST worker representative must be consulted on risk assessment
              activities. All appointments must be documented in writing and kept on file.
            </Text>
          </View>

        </View>
        <Footer siteName={siteName} docNum={docNum} version={version} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 5 — SECTION 3: WORKER GROUPS
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.pagePortrait}>
        <SectionBand num="3" title="Homogeneous Worker Groups" />
        <View style={s.body}>

          {workerGroups.length === 0 ? (
            <Text style={s.td}>No worker groups defined.</Text>
          ) : (
            workerGroups.map((group) => (
              <View key={group.code} style={s.wgCard} wrap={false}>
                <View style={s.wgCardHeader}>
                  <Text style={s.wgCode}>{group.code}</Text>
                  <Text style={s.wgName}>{group.name}</Text>
                </View>
                {group.description ? (
                  <Text style={s.wgDesc}>{group.description}</Text>
                ) : null}
                <View style={s.table}>
                  <View style={s.tableHeader}>
                    <Text style={[s.th, { width: '55%' }]}>Employee Name</Text>
                    <Text style={[s.th, { width: '45%' }]}>Job Title / Role</Text>
                  </View>
                  {group.members.map((m, mi) => (
                    <View key={m.fullName} style={mi % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
                      <Text style={[s.tdBold, { width: '55%' }]}>{m.fullName}</Text>
                      <Text style={[s.td,     { width: '45%' }]}>{m.jobTitle ?? '—'}</Text>
                    </View>
                  ))}
                  {group.members.length === 0 && (
                    <View style={s.tableRow}>
                      <Text style={[s.td, { width: '100%' }]}>No members assigned to this group.</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}

        </View>
        <Footer siteName={siteName} docNum={docNum} version={version} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 6 — SECTION 4: EQUIPMENT REGISTER
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.pagePortrait}>
        <SectionBand num="4" title="Equipment Register  (Art. 71 D.Lgs. 81/2008)" />
        <View style={s.body}>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '32%' }]}>Equipment Name</Text>
              <Text style={[s.th, { width: '20%' }]}>Category</Text>
              <Text style={[s.th, { width: '22%' }]}>Serial / Reference</Text>
              <Text style={[s.th, { width: '26%' }]}>Next Inspection Date</Text>
            </View>
            {equipment.map((eq, i) => {
              const overdue = isOverdue(eq.nextInspectionDate)
              const rowStyle = overdue ? s.overdueRow : (i % 2 === 0 ? s.tableRow : s.tableRowAlt)
              return (
                <View key={eq.serialNumber ?? `${eq.name}-${i}`} style={rowStyle} wrap={false}>
                  <Text style={[s.tdBold, { width: '32%' }]}>{eq.name}</Text>
                  <Text style={[s.td,     { width: '20%' }]}>{eq.category}</Text>
                  <Text style={[s.td,     { width: '22%' }]}>{eq.serialNumber ?? '—'}</Text>
                  <Text style={[s.td,     { width: '26%', color: overdue ? C.highText : C.gray700 }]}>
                    {eq.nextInspectionDate ?? '—'}{overdue ? '  ⚠ OVERDUE' : ''}
                  </Text>
                </View>
              )
            })}
            {equipment.length === 0 && (
              <View style={s.tableRow}>
                <Text style={[s.td, { width: '100%' }]}>No equipment registered for this site.</Text>
              </View>
            )}
          </View>

          {equipment.some((eq) => isOverdue(eq.nextInspectionDate)) && (
            <View style={{
              backgroundColor: C.highBg,
              borderLeftWidth: 3,
              borderLeftColor: C.highText,
              borderRadius: 2,
              padding: 8,
              marginTop: 4,
            }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.highText, marginBottom: 2 }}>
                Action Required — Overdue Inspections
              </Text>
              <Text style={{ fontSize: 7, color: C.highText, lineHeight: 1.5 }}>
                One or more items have passed their next inspection date. Equipment must be re-inspected
                and/or taken out of service until verified as safe to use (Art. 71 D.Lgs. 81/2008).
              </Text>
            </View>
          )}

        </View>
        <Footer siteName={siteName} docNum={docNum} version={version} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 7+ — SECTION 5: RISK MATRIX (landscape)
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="landscape" style={s.pageLandscape}>
        <SectionBand num="5" title="Hazard Identification and Risk Assessment Matrix  (P × D = R)" />

        {/* Risk summary stats */}
        <View style={s.statBar}>
          <View style={[s.statCard, { backgroundColor: C.white, borderColor: C.gray300 }]}>
            <Text style={[s.statNum, { color: C.gray900 }]}>{totalHazards}</Text>
            <Text style={[s.statLabel, { color: C.gray500 }]}>Total Hazards</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.highBg, borderColor: C.highBorder }]}>
            <Text style={[s.statNum, { color: C.highText }]}>{highCount}</Text>
            <Text style={[s.statLabel, { color: C.highText }]}>HIGH Risk</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.medBg, borderColor: C.medBorder }]}>
            <Text style={[s.statNum, { color: C.medText }]}>{mediumCount}</Text>
            <Text style={[s.statLabel, { color: C.medText }]}>MEDIUM Risk</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.lowBg, borderColor: C.lowBorder }]}>
            <Text style={[s.statNum, { color: C.lowText }]}>{lowCount}</Text>
            <Text style={[s.statLabel, { color: C.lowText }]}>LOW Risk</Text>
          </View>
        </View>

        {/* Legend */}
        <Text style={s.riskLegend}>
          P — Probability: 1 Improbable  2 Unlikely  3 Possible  4 Probable   |
          D — Damage: 1 Minor  2 Moderate  3 Severe  4 Fatal   |
          R = P × D   |   LOW R ≤ 3   MEDIUM R 4–8   HIGH R ≥ 9
        </Text>

        {/* Table */}
        <View style={[s.table, { marginHorizontal: 36 }]}>
          <View style={s.tableHeader}>
            <Text style={[s.th, { width: '6%'  }]}>Code</Text>
            <Text style={[s.th, { width: '20%' }]}>Hazard Description</Text>
            <Text style={[s.th, { width: '5%'  }]}>P</Text>
            <Text style={[s.th, { width: '5%'  }]}>D</Text>
            <Text style={[s.th, { width: '5%'  }]}>R</Text>
            <Text style={[s.th, { width: '8%'  }]}>Initial Risk</Text>
            <Text style={[s.th, { width: '23%' }]}>Mitigation Measures</Text>
            <Text style={[s.th, { width: '5%'  }]}>rP</Text>
            <Text style={[s.th, { width: '5%'  }]}>rD</Text>
            <Text style={[s.th, { width: '5%'  }]}>rR</Text>
            <Text style={[s.th, { width: '8%'  }]}>Residual Risk</Text>
          </View>

          {hazards.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={[s.td, { width: '100%' }]}>No applicable hazards assessed yet.</Text>
            </View>
          ) : (
            Array.from(grouped.entries()).flatMap(([processName, actMap]) =>
              Array.from(actMap.entries()).flatMap(([activityName, taskMap]) =>
                Array.from(taskMap.entries()).map(([taskName, rows], taskIdx) => (
                  <TaskGroup
                    key={`${processName}-${activityName}-${taskName}`}
                    processName={processName}
                    activityName={activityName}
                    taskName={taskName}
                    rows={rows}
                    showHeader={taskIdx === 0}
                  />
                ))
              )
            )
          )}
        </View>

        <Footer siteName={siteName} docNum={docNum} version={version} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          LAST PAGE — SECTION 6: SIGNATURES & APPROVAL
      ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.pagePortrait}>
        <SectionBand num="6" title="Signatures and Approval" />

        <View style={s.sigSection}>
          <Text style={s.sigIntro}>
            This Documento di Valutazione dei Rischi (DVR) has been prepared in accordance with D.Lgs. 81/2008
            (Testo Unico sulla Sicurezza sul Lavoro), Art. 28–29. The assessment covers all identified hazards,
            evaluates the associated risks, and defines the prevention and protection measures adopted at the
            workplace specified above. By affixing their signatures below, the undersigned confirm that:
            {'\n\n'}
            (a) the risk assessment accurately reflects the actual working conditions at the site as of the
            assessment date; {'\n'}
            (b) the prevention and protection measures described are adequate and have been or will be implemented;
            {'\n'}
            (c) the document will be updated whenever significant changes to the workplace, work organisation, or
            risk profile occur, or at minimum every three years.
          </Text>

          {/* Three signature boxes */}
          {((): React.ReactNode => {
            const empSig  = approvalSignatures.find((s) => s.roleType === 'EMPLOYER')
            const rsppSig = approvalSignatures.find((s) => s.roleType === 'RSPP')
            const rlsSig  = approvalSignatures.find((s) => s.roleType === 'RLS' || s.roleType === 'RLST')
            return (
              <View style={s.sigRow}>
                <View style={s.sigBox}>
                  <View style={s.sigBoxHead}>
                    <Text style={s.sigBoxRole}>Employer — Datore di Lavoro</Text>
                    <Text style={{ fontSize: 6.5, color: '#93c5fd', marginTop: 2 }}>Art. 17 D.Lgs. 81/2008</Text>
                  </View>
                  <View style={s.sigBoxBody}>
                    <Text style={s.sigFieldLabel}>Name</Text>
                    <Text style={s.sigName}>{empSig?.signerName ?? employerName}</Text>
                    <Text style={s.sigFieldLabel}>Date</Text>
                    {empSig
                      ? <Text style={{ fontSize: 7.5, color: '#15803d', marginBottom: 4 }}>{new Date(empSig.signedAt).toLocaleDateString()}</Text>
                      : <View style={s.sigLine} />}
                    <Text style={s.sigFieldLabel}>Signature</Text>
                    <View style={s.sigLine} />
                    {empSig && <Text style={{ fontSize: 6, color: '#15803d', marginTop: 2 }}>Digitally confirmed</Text>}
                  </View>
                </View>

                <View style={s.sigBox}>
                  <View style={s.sigBoxHead}>
                    <Text style={s.sigBoxRole}>RSPP — Responsabile SPP</Text>
                    <Text style={{ fontSize: 6.5, color: '#93c5fd', marginTop: 2 }}>Art. 31–33 D.Lgs. 81/2008</Text>
                  </View>
                  <View style={s.sigBoxBody}>
                    <Text style={s.sigFieldLabel}>Name</Text>
                    <Text style={s.sigName}>{rsppSig?.signerName ?? rsppName}</Text>
                    <Text style={s.sigFieldLabel}>Date</Text>
                    {rsppSig
                      ? <Text style={{ fontSize: 7.5, color: '#15803d', marginBottom: 4 }}>{new Date(rsppSig.signedAt).toLocaleDateString()}</Text>
                      : <View style={s.sigLine} />}
                    <Text style={s.sigFieldLabel}>Signature</Text>
                    <View style={s.sigLine} />
                    {rsppSig && <Text style={{ fontSize: 6, color: '#15803d', marginTop: 2 }}>Digitally confirmed</Text>}
                  </View>
                </View>

                <View style={s.sigBox}>
                  <View style={s.sigBoxHead}>
                    <Text style={s.sigBoxRole}>RLS / RLST — Worker Representative</Text>
                    <Text style={{ fontSize: 6.5, color: '#93c5fd', marginTop: 2 }}>Art. 50 D.Lgs. 81/2008</Text>
                  </View>
                  <View style={s.sigBoxBody}>
                    <Text style={s.sigFieldLabel}>Name</Text>
                    <Text style={s.sigName}>{rlsSig?.signerName ?? rlsName}</Text>
                    <Text style={s.sigFieldLabel}>Date of Consultation</Text>
                    {rlsSig
                      ? <Text style={{ fontSize: 7.5, color: '#15803d', marginBottom: 4 }}>{new Date(rlsSig.signedAt).toLocaleDateString()}</Text>
                      : <View style={s.sigLine} />}
                    <Text style={s.sigFieldLabel}>Signature</Text>
                    <View style={s.sigLine} />
                    {rlsSig && <Text style={{ fontSize: 6, color: '#15803d', marginTop: 2 }}>Digitally confirmed</Text>}
                  </View>
                </View>
              </View>
            )
          })()}

          {/* Occupational physician note if present */}
          {safetyRoles.find((r) => r.roleType === 'MEDICO_COMPETENTE') ? (
            <View style={[s.sigBox, { marginBottom: 16 }]}>
              <View style={s.sigBoxHead}>
                <Text style={s.sigBoxRole}>Medico Competente — Occupational Physician</Text>
                <Text style={{ fontSize: 6.5, color: '#93c5fd', marginTop: 2 }}>Art. 25 D.Lgs. 81/2008</Text>
              </View>
              <View style={[s.sigBoxBody, { flexDirection: 'row', gap: 24 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sigFieldLabel}>Name</Text>
                  <Text style={s.sigName}>
                    {safetyRoles.find((r) => r.roleType === 'MEDICO_COMPETENTE')?.employeeName ??
                     safetyRoles.find((r) => r.roleType === 'MEDICO_COMPETENTE')?.externalName ?? '—'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sigFieldLabel}>Date</Text>
                  <View style={s.sigLine} />
                  <Text style={s.sigFieldLabel}>Signature</Text>
                  <View style={s.sigLine} />
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Legal certification block */}
        <View style={s.sigLegal}>
          <Text style={s.sigLegalTitle}>Legal Notice — Certificazione di Conformità</Text>
          <Text style={s.sigLegalText}>
            This document constitutes the Documento di Valutazione dei Rischi (DVR) required by Art. 28 of
            D.Lgs. 81/2008. It was prepared with the participation of the RSPP and the RLS/RLST as required by
            Art. 29 paragraph 2. The document must be kept at the workplace and made available upon request to
            the Ispettorato Nazionale del Lavoro (INL), INAIL, and other competent authorities.
            {'\n\n'}
            Failure to prepare or maintain this document may result in administrative fines and criminal
            liability under Art. 55 D.Lgs. 81/2008. This document was generated automatically on {generatedDate}
            and requires manual review before it is considered legally valid.
          </Text>
        </View>

        <Footer siteName={siteName} docNum={docNum} version={version} />
      </Page>

      {/* ─── Section 7 — Corrective Action Plan ──────────────────────────────── */}
      {correctiveActions.length > 0 ? (
        <Page size="A4" style={s.pagePortrait}>
          <SectionBand num="7" title="Corrective Action Plan  (Art. 28(2)(d) D.Lgs. 81/2008)" />
          <View style={{ paddingHorizontal: 32, paddingBottom: 4 }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 10 }}>
              Prevention and protection measures assigned and tracked below.
            </Text>

          {/* Summary row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Total',       value: correctiveActions.length, color: '#1e40af' },
              { label: 'Open',        value: correctiveActions.filter((a) => a.status === 'OPEN').length,        color: '#1d4ed8' },
              { label: 'In Progress', value: correctiveActions.filter((a) => a.status === 'IN_PROGRESS').length, color: '#92400e' },
              { label: 'Overdue',     value: correctiveActions.filter((a) => a.status === 'OVERDUE').length,     color: '#991b1b' },
              { label: 'Completed',   value: correctiveActions.filter((a) => a.status === 'COMPLETED').length,   color: '#065f46' },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, backgroundColor: '#f8fafc', border: '1pt solid #e2e8f0', borderRadius: 4, padding: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: stat.color }}>{stat.value}</Text>
                <Text style={{ fontSize: 7, color: '#64748b', marginTop: 2 }}>{stat.label.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {/* Actions table */}
          <View style={{ border: '1pt solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            {/* Table header */}
            <View style={{ flexDirection: 'row', backgroundColor: '#1e3a5f', padding: 6 }}>
              <Text style={{ flex: 3, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Action / Hazard</Text>
              <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' }}>Priority</Text>
              <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' }}>Status</Text>
              <Text style={{ flex: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Assigned To</Text>
              <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' }}>Due Date</Text>
            </View>

            {correctiveActions.map((action, idx) => (
              <ActionRow key={action.id} action={action} alt={idx % 2 !== 0} />
            ))}
          </View>
          </View>

          <Footer siteName={siteName} docNum={docNum} version={version} />
        </Page>
      ) : null}

      {/* ─── Section 8 — Training Register ───────────────────────────────────── */}
      {trainingRecords.length > 0 ? (
        <Page size="A4" style={s.pagePortrait}>
          <SectionBand num="8" title="Training Register  (Art. 37 D.Lgs. 81/2008)" />
          <View style={{ paddingHorizontal: 32, paddingBottom: 4 }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 10 }}>
              Safety training records for all worker groups. Status: VALID = active; EXPIRING SOON = within 60 days; EXPIRED = past expiry.
            </Text>

            {/* Table */}
            <View style={{ border: '1pt solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#1e3a5f', padding: 6 }}>
                <Text style={{ flex: 3, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Training Type</Text>
                <Text style={{ flex: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Worker Group</Text>
                <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Trainer</Text>
                <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' }}>Date</Text>
                <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' }}>Expiry</Text>
                <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Certificate</Text>
                <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' }}>Status</Text>
              </View>

              {trainingRecords.map((rec, idx) => {
                const alt  = idx % 2 !== 0
                const bg   = alt ? '#f8fafc' : '#ffffff'
                const statusColor
                  = rec.status === 'EXPIRED'        ? '#991b1b'
                  : rec.status === 'EXPIRING_SOON'  ? '#92400e'
                  : '#065f46'
                return (
                  <View key={rec.id} style={{ flexDirection: 'row', backgroundColor: bg, padding: '5 6', borderTop: idx === 0 ? 0 : '0.5pt solid #e2e8f0' }}>
                    <Text style={{ flex: 3, fontSize: 7, color: '#1e293b' }}>{rec.trainingType}</Text>
                    <Text style={{ flex: 2, fontSize: 7, color: '#475569' }}>
                      {rec.workerGroupCode ? `${rec.workerGroupCode} — ${rec.workerGroupName ?? ''}` : '—'}
                    </Text>
                    <Text style={{ flex: 1.5, fontSize: 7, color: '#475569' }}>{rec.trainerName ?? '—'}</Text>
                    <Text style={{ flex: 1, fontSize: 7, color: '#475569', textAlign: 'center' }}>{rec.trainingDate.slice(0, 10)}</Text>
                    <Text style={{ flex: 1, fontSize: 7, color: '#475569', textAlign: 'center' }}>{rec.expiryDate ? rec.expiryDate.slice(0, 10) : '—'}</Text>
                    <Text style={{ flex: 1.5, fontSize: 7, color: '#475569' }}>{rec.certificateRef ?? '—'}</Text>
                    <Text style={{ flex: 1, fontSize: 6.5, color: statusColor, textAlign: 'center', fontFamily: 'Helvetica-Bold' }}>
                      {rec.status === 'EXPIRING_SOON' ? 'EXP.SOON' : rec.status}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          <Footer siteName={siteName} docNum={docNum} version={version} />
        </Page>
      ) : null}

      {/* ─── Section 9 — Incident & Near-Miss Register ────────────────────────── */}
      {incidents.length > 0 ? (
        <Page size="A4" style={s.pagePortrait}>
          <SectionBand num="9" title="Incident &amp; Near-Miss Register  (Art. 28(2)(c) D.Lgs. 81/2008)" />
          <View style={{ paddingHorizontal: 32, paddingBottom: 4 }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 10 }}>
              Records of workplace accidents, near-misses, dangerous occurrences, and occupational diseases.
            </Text>

            <View style={{ border: '1pt solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', backgroundColor: '#7f1d1d', padding: 6 }}>
                <Text style={{ flex: 1.2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Date</Text>
                <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Type</Text>
                <Text style={{ flex: 1.2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Severity</Text>
                <Text style={{ flex: 4, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Title</Text>
                <Text style={{ flex: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Location</Text>
                <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center' }}>Status</Text>
              </View>

              {incidents.map((inc, idx) => (
                <IncidentRow key={inc.id} incident={inc} idx={idx} />
              ))}
            </View>
          </View>

          <Footer siteName={siteName} docNum={docNum} version={version} />
        </Page>
      ) : null}

    </Document>
  )
}
