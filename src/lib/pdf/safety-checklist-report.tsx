import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    fontSize:        9,
    padding:         40,
    backgroundColor: '#ffffff',
    color:           '#1a1a1a',
  },

  /* ── Cover / header ───────────────────────────────────── */
  coverBar: {
    backgroundColor: '#1e40af',
    padding:         16,
    marginBottom:    12,
  },
  coverTitle: {
    fontSize:    16,
    fontFamily:  'Helvetica-Bold',
    color:       '#ffffff',
    marginBottom: 3,
  },
  coverSub: {
    fontSize: 8,
    color:    '#bfdbfe',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom:  3,
  },
  metaLabel: {
    fontSize:    8,
    color:       '#6b7280',
    width:       100,
    flexShrink:  0,
  },
  metaValue: {
    fontSize:   8,
    color:      '#111827',
    fontFamily: 'Helvetica-Bold',
    flex:       1,
  },

  /* ── Disclaimer ───────────────────────────────────────── */
  disclaimer: {
    backgroundColor: '#fefce8',
    borderWidth:     1,
    borderColor:     '#fde047',
    borderRadius:    4,
    padding:         '6 10',
    marginBottom:    12,
  },
  disclaimerText: {
    fontSize: 7.5,
    color:    '#713f12',
  },

  /* ── Progress bar ─────────────────────────────────────── */
  progressWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    marginBottom:   14,
  },
  progressTrack: {
    flex:            1,
    height:          6,
    backgroundColor: '#e5e7eb',
    borderRadius:    3,
  },
  progressFill: {
    height:          6,
    backgroundColor: '#2563eb',
    borderRadius:    3,
  },
  progressLabel: {
    fontSize: 8,
    color:    '#374151',
    width:    90,
    flexShrink: 0,
  },

  /* ── Category heading ─────────────────────────────────── */
  catHeading: {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    color:         '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    backgroundColor: '#f3f4f6',
    padding:       '4 8',
    marginBottom:  4,
  },

  /* ── Item card ────────────────────────────────────────── */
  itemCard: {
    borderWidth:   1,
    borderColor:   '#e5e7eb',
    borderRadius:  3,
    padding:       '7 9',
    marginBottom:  5,
  },
  itemRow: {
    flexDirection: 'row',
    gap:           6,
    marginBottom:  3,
    alignItems:    'flex-start',
  },
  statusPill: {
    fontSize:      7,
    fontFamily:    'Helvetica-Bold',
    borderRadius:  3,
    padding:       '1 4',
    minWidth:      58,
    textAlign:     'center',
  },
  statusNS:   { backgroundColor: '#f3f4f6', color: '#374151' },
  statusIP:   { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  statusDone: { backgroundColor: '#dcfce7', color: '#15803d' },
  statusNA:   { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  itemTitle: {
    flex:       1,
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      '#111827',
  },
  mandatoryBadge: {
    fontSize:      7,
    fontFamily:    'Helvetica-Bold',
    color:         '#b91c1c',
    backgroundColor: '#fee2e2',
    borderRadius:  3,
    padding:       '1 4',
  },
  recurringBadge: {
    fontSize:   7,
    color:      '#6b7280',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 3,
    padding:    '1 4',
  },
  itemFieldRow: {
    flexDirection: 'row',
    marginBottom:  2,
    paddingLeft:   64,
  },
  fieldLabel: {
    fontSize:   7.5,
    color:      '#9ca3af',
    width:      80,
    flexShrink: 0,
  },
  fieldValue: {
    fontSize: 7.5,
    color:    '#374151',
    flex:     1,
  },
  descriptionText: {
    fontSize:    7.5,
    color:       '#6b7280',
    paddingLeft: 64,
    marginTop:   2,
    lineHeight:  1.5,
  },
  notesText: {
    fontSize:          7.5,
    color:             '#374151',
    paddingLeft:       64,
    marginTop:         2,
    fontStyle:         'italic',
    borderLeftWidth:   2,
    borderLeftColor:   '#93c5fd',
    paddingLeft2:      68,
  },

  /* ── Signature block ──────────────────────────────────── */
  sigSection: {
    marginTop:   24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop:  12,
  },
  sigHeading: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sigRow: {
    flexDirection: 'row',
    gap:           16,
  },
  sigBlock: {
    flex:          1,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop:    4,
  },
  sigLabel: {
    fontSize: 7.5,
    color:    '#6b7280',
  },

  /* ── Footer ───────────────────────────────────────────── */
  pageFooter: {
    position: 'absolute',
    bottom:   24,
    left:     40,
    right:    40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color:    '#9ca3af',
  },
})

export interface ChecklistItemData {
  id:           string
  status:       string
  dueDate:      string | null
  notes:        string | null
  assignedTo:   { fullName: string } | null
  requirement: {
    title:            string
    legalReference:   string
    category:         string
    mandatory:        boolean
    recurring:        boolean
    requiredRole:     string | null
    requiredDocument: string | null
    description:      string | null
  }
}

export interface SafetyChecklistReportProps {
  projectName:      string
  projectCode:      string
  projectStatus:    string
  countryName:      string | null
  organizationName: string
  generatedDate:    string
  mandatoryTotal:   number
  mandatoryComplete: number
  items:            ChecklistItemData[]
}

function statusStyle(s: string) {
  if (s === 'DONE')           return { ...styles.statusPill, ...styles.statusDone }
  if (s === 'IN_PROGRESS')    return { ...styles.statusPill, ...styles.statusIP }
  if (s === 'NOT_APPLICABLE') return { ...styles.statusPill, ...styles.statusNA }
  return { ...styles.statusPill, ...styles.statusNS }
}

function statusLabel(s: string) {
  if (s === 'DONE')           return 'DONE'
  if (s === 'IN_PROGRESS')    return 'IN PROGRESS'
  if (s === 'NOT_APPLICABLE') return 'N/A'
  return 'NOT STARTED'
}

function groupByCategory(items: ChecklistItemData[]) {
  return items.reduce<Record<string, ChecklistItemData[]>>((acc, item) => {
    const cat = item.requirement.category
    if (!acc[cat]) acc[cat] = []
    acc[cat]!.push(item)
    return acc
  }, {})
}

export function SafetyChecklistReport({
  projectName, projectCode, projectStatus, countryName,
  organizationName, generatedDate,
  mandatoryTotal, mandatoryComplete, items,
}: SafetyChecklistReportProps) {
  const pct     = mandatoryTotal > 0 ? Math.round((mandatoryComplete / mandatoryTotal) * 100) : 0
  const grouped = groupByCategory(items)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cover */}
        <View style={styles.coverBar}>
          <Text style={styles.coverTitle}>Safety Checklist — {projectName}</Text>
          <Text style={styles.coverSub}>{projectCode} · {organizationName} · Generated {generatedDate}</Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Project Status</Text>
            <Text style={styles.metaValue}>{projectStatus}</Text>
          </View>
          {countryName !== null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Country</Text>
              <Text style={styles.metaValue}>{countryName}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Mandatory Progress</Text>
            <Text style={styles.metaValue}>{mandatoryComplete} / {mandatoryTotal} complete ({pct}%)</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={{ ...styles.progressFill, width: `${pct}%` }} />
          </View>
          <Text style={styles.progressLabel}>{pct}% mandatory done</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This checklist is a compliance aid only. It does not constitute legal certification.
            All items must be verified by a qualified professional (RSPP / CSP-CSE / fire-safety
            specialist as applicable) before project activation.
          </Text>
        </View>

        {/* Items grouped by category */}
        {Object.entries(grouped).map(([cat, catItems]) => (
          <View key={cat}>
            <Text style={styles.catHeading}>{cat.replace(/_/g, ' ')}</Text>
            {catItems.map((item) => (
              <View key={item.id} style={styles.itemCard} wrap={false}>
                <View style={styles.itemRow}>
                  <Text style={statusStyle(item.status)}>{statusLabel(item.status)}</Text>
                  <Text style={styles.itemTitle}>{item.requirement.title}</Text>
                  {item.requirement.mandatory && (
                    <Text style={styles.mandatoryBadge}>MANDATORY</Text>
                  )}
                  {item.requirement.recurring && (
                    <Text style={styles.recurringBadge}>RECURRING</Text>
                  )}
                </View>

                <View style={styles.itemFieldRow}>
                  <Text style={styles.fieldLabel}>Legal Ref</Text>
                  <Text style={styles.fieldValue}>{item.requirement.legalReference}</Text>
                </View>

                {item.requirement.requiredRole && (
                  <View style={styles.itemFieldRow}>
                    <Text style={styles.fieldLabel}>Required Role</Text>
                    <Text style={styles.fieldValue}>{item.requirement.requiredRole}</Text>
                  </View>
                )}

                {item.requirement.requiredDocument && (
                  <View style={styles.itemFieldRow}>
                    <Text style={styles.fieldLabel}>Required Doc</Text>
                    <Text style={styles.fieldValue}>{item.requirement.requiredDocument}</Text>
                  </View>
                )}

                {item.dueDate && (
                  <View style={styles.itemFieldRow}>
                    <Text style={styles.fieldLabel}>Due Date</Text>
                    <Text style={styles.fieldValue}>{new Date(item.dueDate).toLocaleDateString('en-GB')}</Text>
                  </View>
                )}

                {item.assignedTo && (
                  <View style={styles.itemFieldRow}>
                    <Text style={styles.fieldLabel}>Assigned To</Text>
                    <Text style={styles.fieldValue}>{item.assignedTo.fullName}</Text>
                  </View>
                )}

                {item.requirement.description && (
                  <Text style={styles.descriptionText}>{item.requirement.description}</Text>
                )}

                {item.notes && (
                  <Text style={styles.notesText}>Note: {item.notes}</Text>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Signature block */}
        <View style={styles.sigSection}>
          <Text style={styles.sigHeading}>Verification Sign-Off</Text>
          <View style={styles.sigRow}>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Reviewed by (Name / Role)</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Qualification / License No.</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Date</Text>
            </View>
          </View>
        </View>

        {/* Page footer */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerText}>{projectName} — Safety Checklist</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
