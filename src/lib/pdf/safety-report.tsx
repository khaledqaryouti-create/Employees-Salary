import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Colour tokens ────────────────────────────────────────────────────────────

const C = {
  navy:      '#0d3b6e',
  navyMid:   '#1e4d8c',
  navyLight: '#e8f0fe',
  white:     '#ffffff',
  gray900:   '#111827',
  gray700:   '#374151',
  gray500:   '#6b7280',
  gray300:   '#d1d5db',
  gray100:   '#f3f4f6',
  green:     '#166534',
  greenBg:   '#dcfce7',
  amber:     '#92400e',
  amberBg:   '#fef3c7',
  red:       '#991b1b',
  redBg:     '#fee2e2',
  blue:      '#1d4ed8',
  blueBg:    '#dbeafe',
}

const DVR_STATUS_LABEL: Record<string, string> = {
  SETUP:                     'Setup',
  DATA_COLLECTION:           'Data Collection',
  READINESS_REVIEW:          'Readiness Review',
  ASSESSMENT_IN_PROGRESS:    'Assessment In Progress',
  CONSULTATION_AND_APPROVAL: 'Consultation & Approval',
  APPROVED_AND_MONITORED:    'Approved & Monitored',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily:  'Helvetica',
    fontSize:    8.5,
    color:       C.gray700,
    backgroundColor: C.white,
    paddingBottom: 40,
  },
  body: { paddingHorizontal: 36, paddingTop: 24 },

  // Cover
  coverPage: {
    fontFamily: 'Helvetica', backgroundColor: C.navy, color: C.white,
    padding: 0, flexDirection: 'column', justifyContent: 'center',
  },
  coverHeader: {
    backgroundColor: C.navyMid, paddingHorizontal: 48, paddingTop: 60, paddingBottom: 32,
  },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 8 },
  coverSubtitle: { fontSize: 13, color: '#93c5fd', marginBottom: 4 },
  coverMeta: { fontSize: 10, color: '#bfdbfe', marginTop: 4 },
  coverBody: { paddingHorizontal: 48, paddingTop: 36 },
  coverKpiRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  coverKpiBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, padding: 16, alignItems: 'center',
  },
  coverKpiValue: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: C.white },
  coverKpiLabel: { fontSize: 8, color: '#93c5fd', marginTop: 4, textAlign: 'center' },

  // Section headers
  sectionHeader: {
    backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 10,
  },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: 0.5 },

  // Table
  table: { width: '100%', marginBottom: 12 },
  thead: { backgroundColor: C.gray100, flexDirection: 'row' },
  th: { flex: 1, paddingHorizontal: 6, paddingVertical: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.gray700 },
  thWide: { flex: 2, paddingHorizontal: 6, paddingVertical: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.gray700 },
  tr: { flexDirection: 'row', borderBottom: `1 solid ${C.gray300}` },
  td: { flex: 1, paddingHorizontal: 6, paddingVertical: 4, fontSize: 7.5, color: C.gray700 },
  tdWide: { flex: 2, paddingHorizontal: 6, paddingVertical: 4, fontSize: 7.5, color: C.gray700 },
  trAlt: { flexDirection: 'row', borderBottom: `1 solid ${C.gray300}`, backgroundColor: C.gray100 },

  // Score badge
  scoreHigh: { color: C.green, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  scoreMid:  { color: C.amber, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  scoreLow:  { color: C.red,   fontFamily: 'Helvetica-Bold', fontSize: 8 },

  // Footer
  footer: {
    position: 'absolute', bottom: 16, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTop: `1 solid ${C.gray300}`, paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.gray500 },

  // Misc
  row2: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },
  subTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray900, marginBottom: 6, marginTop: 10 },
  label: { fontSize: 7.5, color: C.gray500, marginBottom: 2 },
  value: { fontSize: 8, color: C.gray900, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  pill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SafetyReportData {
  organizationName: string
  reportPeriod: string
  generatedAt: string
  totals: {
    sites: number
    approvedSites: number
    openActions: number
    openIncidents: number
  }
  dvrCounts: { status: string; count: number }[]
  trainingCounts: { status: string; count: number }[]
  trend: { month: string; incidents: number; actions: number }[]
  sites: {
    id: string
    name: string
    city: string | null
    dvrStatus: string
    safetyScore: number
    actions: number
    incidents: number
    trainingValid: number
    trainingTotal: number
    contractors: number
    expiringPermits: number
  }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreText({ score }: { score: number }) {
  const style = score >= 75 ? s.scoreHigh : score >= 50 ? s.scoreMid : s.scoreLow
  return <Text style={style}>{score}/100</Text>
}

function Footer({ org, page }: { org: string; page: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Multi-Site Safety Report — {org}</Text>
      <Text style={s.footerText}>{page}</Text>
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function SafetyReport({ data }: { data: SafetyReportData }) {
  const trainingValid   = data.trainingCounts.find((c) => c.status === 'VALID')?.count     ?? 0
  const trainingExpiring= data.trainingCounts.find((c) => c.status === 'EXPIRING_SOON')?.count ?? 0
  const trainingExpired = data.trainingCounts.find((c) => c.status === 'EXPIRED')?.count   ?? 0
  const trainingTotal   = trainingValid + trainingExpiring + trainingExpired

  return (
    <Document title={`Safety Report — ${data.organizationName}`}>

      {/* ── Cover page ─────────────────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverHeader}>
          <Text style={s.coverTitle}>Multi-Site Safety Report</Text>
          <Text style={s.coverSubtitle}>{data.organizationName}</Text>
          <Text style={s.coverMeta}>Period: {data.reportPeriod}</Text>
          <Text style={s.coverMeta}>Generated: {data.generatedAt}</Text>
        </View>
        <View style={s.coverBody}>
          <View style={s.coverKpiRow}>
            <View style={s.coverKpiBox}>
              <Text style={s.coverKpiValue}>{data.totals.sites}</Text>
              <Text style={s.coverKpiLabel}>Active Sites</Text>
            </View>
            <View style={s.coverKpiBox}>
              <Text style={s.coverKpiValue}>{data.totals.approvedSites}</Text>
              <Text style={s.coverKpiLabel}>DVR Approved</Text>
            </View>
            <View style={s.coverKpiBox}>
              <Text style={s.coverKpiValue}>{data.totals.openActions}</Text>
              <Text style={s.coverKpiLabel}>Open Actions</Text>
            </View>
            <View style={s.coverKpiBox}>
              <Text style={s.coverKpiValue}>{data.totals.openIncidents}</Text>
              <Text style={s.coverKpiLabel}>Open Incidents</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── Summary page ───────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>1. EXECUTIVE SUMMARY</Text>
          </View>

          {/* DVR Status table */}
          <Text style={s.subTitle}>DVR Status Distribution</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={s.thWide}>Status</Text>
              <Text style={s.th}>Sites</Text>
              <Text style={s.th}>% of Total</Text>
            </View>
            {['SETUP','DATA_COLLECTION','READINESS_REVIEW','ASSESSMENT_IN_PROGRESS','CONSULTATION_AND_APPROVAL','APPROVED_AND_MONITORED'].map((st, i) => {
              const count = data.dvrCounts.find((c) => c.status === st)?.count ?? 0
              const pct   = data.totals.sites > 0 ? Math.round((count / data.totals.sites) * 100) : 0
              return (
                <View key={st} style={i % 2 === 1 ? s.trAlt : s.tr}>
                  <Text style={s.tdWide}>{DVR_STATUS_LABEL[st] ?? st}</Text>
                  <Text style={s.td}>{count}</Text>
                  <Text style={s.td}>{pct}%</Text>
                </View>
              )
            })}
          </View>

          {/* Training summary */}
          <Text style={s.subTitle}>Training Record Overview</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={s.thWide}>Status</Text>
              <Text style={s.th}>Count</Text>
              <Text style={s.th}>% of Total</Text>
            </View>
            {[
              { status: 'VALID',         label: 'Valid' },
              { status: 'EXPIRING_SOON', label: 'Expiring Soon' },
              { status: 'EXPIRED',       label: 'Expired' },
            ].map(({ status, label }, i) => {
              const count = data.trainingCounts.find((c) => c.status === status)?.count ?? 0
              const pct   = trainingTotal > 0 ? Math.round((count / trainingTotal) * 100) : 0
              return (
                <View key={status} style={i % 2 === 1 ? s.trAlt : s.tr}>
                  <Text style={s.tdWide}>{label}</Text>
                  <Text style={s.td}>{count}</Text>
                  <Text style={s.td}>{pct}%</Text>
                </View>
              )
            })}
          </View>

          {/* Trend table */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>2. MONTHLY TREND (LAST 6 MONTHS)</Text>
          </View>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={s.thWide}>Month</Text>
              <Text style={s.th}>Incidents</Text>
              <Text style={s.th}>New Actions</Text>
            </View>
            {data.trend.map((row, i) => (
              <View key={row.month} style={i % 2 === 1 ? s.trAlt : s.tr}>
                <Text style={s.tdWide}>{row.month}</Text>
                <Text style={s.td}>{row.incidents}</Text>
                <Text style={s.td}>{row.actions}</Text>
              </View>
            ))}
          </View>
        </View>
        <Footer org={data.organizationName} page="Page 2" />
      </Page>

      {/* ── Per-site detail ────────────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.body}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>3. SITE-BY-SITE DETAIL</Text>
          </View>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.thWide, { flex: 2.5 }]}>Site</Text>
              <Text style={s.th}>DVR Status</Text>
              <Text style={s.th}>Safety Score</Text>
              <Text style={s.th}>Open Actions</Text>
              <Text style={s.th}>Incidents</Text>
              <Text style={s.th}>Training</Text>
              <Text style={s.th}>Contractors</Text>
              <Text style={s.th}>Exp. Permits</Text>
            </View>
            {data.sites.map((site, i) => {
              const trainingPct = site.trainingTotal > 0
                ? `${Math.round((site.trainingValid / site.trainingTotal) * 100)}%`
                : '—'
              return (
                <View key={site.id} style={i % 2 === 1 ? s.trAlt : s.tr}>
                  <Text style={[s.tdWide, { flex: 2.5 }]}>
                    {site.name}{site.city ? ` (${site.city})` : ''}
                  </Text>
                  <Text style={s.td}>{DVR_STATUS_LABEL[site.dvrStatus] ?? site.dvrStatus}</Text>
                  <View style={s.td}><ScoreText score={site.safetyScore} /></View>
                  <Text style={s.td}>{site.actions}</Text>
                  <Text style={s.td}>{site.incidents}</Text>
                  <Text style={s.td}>{trainingPct}</Text>
                  <Text style={s.td}>{site.contractors}</Text>
                  <Text style={[s.td, site.expiringPermits > 0 ? { color: C.amber, fontFamily: 'Helvetica-Bold' } : {}]}>
                    {site.expiringPermits > 0 ? `⚠ ${site.expiringPermits}` : '—'}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
        <Footer org={data.organizationName} page="Page 3" />
      </Page>

    </Document>
  )
}
