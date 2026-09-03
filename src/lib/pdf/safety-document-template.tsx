import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 48,
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },
  headerBar: {
    backgroundColor: '#1e40af',
    padding: 14,
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  headerSub: {
    fontSize: 8,
    color: '#bfdbfe',
  },
  docTypeBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 4,
    padding: '6 10',
    marginTop: 10,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  docTypeText: {
    fontSize: 9,
    color: '#1d4ed8',
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    width: 110,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 8,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  disclaimer: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 4,
    padding: '7 10',
    marginBottom: 14,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: '#713f12',
  },
  bodySection: {
    marginBottom: 14,
  },
  bodyLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 5,
  },
  bodyText: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.5,
  },
  linedArea: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 3,
    padding: 8,
    minHeight: 100,
  },
  guideLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 10,
  },
  notesBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 3,
    padding: 8,
    minHeight: 60,
    marginTop: 4,
  },
  notesText: {
    fontSize: 8,
    color: '#374151',
  },
  notesEmpty: {
    fontSize: 8,
    color: '#9ca3af',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 48,
    right: 48,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  signatureBlock: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 7.5,
    color: '#6b7280',
  },
  footerNote: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
})

export interface SafetyDocumentProps {
  requirementTitle: string
  legalReference:   string
  requiredDocument: string
  description:      string
  projectName:      string
  projectCode:      string
  projectType:      string | null
  countryName:      string | null
  projectStartDate: string
  projectStatus:    string
  organizationName: string
  generatedDate:    string
  notes:            string | null
}

const GUIDE_LINES = Array.from({ length: 8 }, (_, i) => i)

export function SafetyDocumentTemplate({
  requirementTitle, legalReference, requiredDocument, description,
  projectName, projectCode, projectType, countryName, projectStartDate,
  projectStatus, organizationName, generatedDate, notes,
}: SafetyDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{requirementTitle}</Text>
          <Text style={styles.headerSub}>{legalReference}</Text>
        </View>

        {/* Document type badge */}
        <View style={styles.docTypeBadge}>
          <Text style={styles.docTypeText}>Document Type: {requiredDocument}</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This is a blank template. It must be completed, reviewed, and certified by a
            qualified professional (RSPP / CSP-CSE / fire-safety professional as applicable).
            It does not constitute legal compliance certification.
          </Text>
        </View>

        {/* Project info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Project Name</Text>
            <Text style={styles.infoValue}>{projectName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Project Code</Text>
            <Text style={styles.infoValue}>{projectCode}</Text>
          </View>
          {projectType !== null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Project Type</Text>
              <Text style={styles.infoValue}>{projectType.replace(/_/g, ' ')}</Text>
            </View>
          )}
          {countryName !== null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Country</Text>
              <Text style={styles.infoValue}>{countryName}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date</Text>
            <Text style={styles.infoValue}>{projectStartDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{projectStatus}</Text>
          </View>
        </View>

        {/* Organization info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organization</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organization</Text>
            <Text style={styles.infoValue}>{organizationName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date Generated</Text>
            <Text style={styles.infoValue}>{generatedDate}</Text>
          </View>
        </View>

        {/* Description */}
        {description.length > 0 && (
          <View style={styles.bodySection}>
            <Text style={styles.bodyLabel}>Regulatory Description</Text>
            <Text style={styles.bodyText}>{description}</Text>
          </View>
        )}

        {/* Assessment / Content area */}
        <View style={styles.bodySection}>
          <Text style={styles.bodyLabel}>Assessment / Content</Text>
          <View style={styles.linedArea}>
            {GUIDE_LINES.map((i) => (
              <View key={i} style={styles.guideLine} />
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.bodySection}>
          <Text style={styles.bodyLabel}>Notes</Text>
          <View style={styles.notesBox}>
            {notes
              ? <Text style={styles.notesText}>{notes}</Text>
              : <Text style={styles.notesEmpty}>—</Text>
            }
          </View>
        </View>

        {/* Footer with signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Prepared by (Name / Role / Date)</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Reviewed by (Name / Qualification / Date)</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Approved by (Name / Date)</Text>
            </View>
          </View>
          <Text style={styles.footerNote}>
            {organizationName} · Generated {generatedDate} · {legalReference}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
