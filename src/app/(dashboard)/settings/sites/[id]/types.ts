export interface EmployeeRef {
  id:       string
  fullName: string
  jobTitle: string | null
}

export interface SafetyRole {
  id:              string
  roleType:        string
  employeeId:      string | null
  employee:        EmployeeRef | null
  externalName:    string | null
  appointmentDate: string
  expiryDate:      string | null
  documentUrl:     string | null
  notes:           string | null
  isActive:        boolean
}

export interface WorkerGroupMember {
  id:         string
  employeeId: string
  employee:   EmployeeRef
}

export interface WorkerGroup {
  id:          string
  code:        string
  name:        string
  description: string | null
  isActive:    boolean
  members:     WorkerGroupMember[]
}

export interface ApprovalSignature {
  id:         string
  dvrId:      string
  roleType:   string
  signerName: string
  signedAt:   string
  notes:      string | null
}

export interface DvrSetup {
  id:                    string
  status:                string
  version:               number
  documentNumber:        string | null
  assessmentScope:       string | null
  assessmentDate:        string | null
  nextReviewDate:        string | null
  reviewFrequencyMonths: number
  approvedByName:        string | null
  approvedAt:            string | null
  approvalSignatures?:   ApprovalSignature[]
}

export interface SiteDetail {
  id:               string
  name:             string
  legalEntityName:  string | null
  vatNumber:        string | null
  taxCode:          string | null
  atecoCode:        string | null
  atecoDescription: string | null
  address:          string | null
  city:             string | null
  country:          string | null
  workingHours:     string | null
  shiftPattern:     string | null
  isActive:         boolean
  dvr:              DvrSetup | null
  safetyRoles:      SafetyRole[]
  workerGroups:     WorkerGroup[]
}

export interface GateItem {
  key:      string
  label:    string
  passed:   boolean
  severity: 'CRITICAL' | 'MANDATORY' | 'WARNING'
  reason?:  string
}

export interface GateResult {
  passed: boolean
  items:  GateItem[]
}

export interface Gate7GroupCoverage {
  groupId:    string
  groupName:  string
  groupCode:  string
  hasTrained: boolean
}

export interface ReadinessResult {
  gate1: GateResult
  gate2: GateResult
  gate3: GateResult
  gate4: GateResult
  gate5: GateResult
  gate6: GateResult
  gate7: GateResult & { groupCoverage: Gate7GroupCoverage[] }
  overallPassed:    boolean
  criticalBlockers: number
  mandatoryMissing: number
}

// ─── Process / Activity / Task ────────────────────────────────────────────────

export interface HazardScreening {
  hazardCode:          string
  isApplicable:        boolean
  justification:       string | null
  assessorName:        string | null
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

export interface TaskRef {
  id:               string
  name:             string
  description:      string | null
  normalOp:         boolean
  setupShutdown:    boolean
  maintenance:      boolean
  emergencyRecovery: boolean
  contractorWork:   boolean
  isActive:         boolean
  workerGroups:     { groupId: string; group: { name: string } }[]
  equipmentLinks:   { equipmentId: string; equipment: { name: string } }[]
  hazardScreenings: HazardScreening[]
}

export interface ActivityRef {
  id:          string
  name:        string
  description: string | null
  isActive:    boolean
  tasks:       TaskRef[]
}

export interface ProcessRef {
  id:          string
  name:        string
  description: string | null
  isActive:    boolean
  activities:  ActivityRef[]
}

// ─── Corrective Actions ───────────────────────────────────────────────────────

export interface CorrectiveActionHazardRef {
  id:        string
  hazardCode: string
  taskId:    string
  task:      { name: string }
}

export interface CorrectiveAction {
  id:              string
  title:           string
  description:     string | null
  priority:        'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status:          'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  assignedToId:    string | null
  assignedTo:      { id: string; fullName: string; jobTitle: string | null } | null
  dueDate:         string | null
  completedDate:   string | null
  verificationNote: string | null
  hazardId:        string | null
  hazard:          CorrectiveActionHazardRef | null
  createdAt:       string
  updatedAt:       string
}

// ─── Training Records ─────────────────────────────────────────────────────────

export interface TrainingRecord {
  id:             string
  trainingType:   string
  description:    string | null
  trainerName:    string | null
  trainingDate:   string
  expiryDate:     string | null
  certificateRef: string | null
  status:         'VALID' | 'EXPIRING_SOON' | 'EXPIRED'
  workerGroupId:  string | null
  workerGroup:    { id: string; name: string; code: string } | null
  employeeId:     string | null
  employee:       { id: string; fullName: string } | null
  createdAt:      string
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export type IncidentType = 'ACCIDENT' | 'NEAR_MISS' | 'DANGEROUS_OCCURRENCE' | 'OCCUPATIONAL_DISEASE'
export type IncidentSeverity = 'FATAL' | 'MAJOR' | 'MINOR' | 'FIRST_AID_ONLY' | 'NO_INJURY'
export type IncidentStatus = 'REPORTED' | 'UNDER_INVESTIGATION' | 'CORRECTIVE_ACTIONS_ASSIGNED' | 'CLOSED'

export interface Incident {
  id:             string
  incidentType:   IncidentType
  severity:       IncidentSeverity
  status:         IncidentStatus
  incidentDate:   string
  reportedDate:   string
  title:          string
  description:    string | null
  location:       string | null
  injuredPerson:  string | null
  witnesses:      string | null
  immediateAction: string | null
  rootCause:      string | null
  hazardId:       string | null
  hazard:         { hazardCode: string } | null
  createdAt:      string
  updatedAt:      string
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export interface SiteEquipmentItem {
  id:                        string
  name:                      string
  category:                  string
  serialNumber:              string | null
  manufacturer:              string | null
  model:                     string | null
  certificationRef:          string | null
  inspectionFrequencyMonths: number | null
  lastInspectionDate:        string | null
  nextInspectionDate:        string | null
  notes:                     string | null
  isActive:                  boolean
  taskLinks:                 { taskId: string; task: { name: string } }[]
}
