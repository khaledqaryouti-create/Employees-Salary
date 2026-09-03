'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2, Circle, Lock, Unlock, Loader2, Pen, Trash2,
  ChevronRight, BadgeCheck, RotateCcw, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DvrSetup, ApprovalSignature, SafetyRole } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const DVR_STATUSES = [
  { id: 'SETUP',                     label: 'Setup' },
  { id: 'DATA_COLLECTION',           label: 'Data Collection' },
  { id: 'READINESS_REVIEW',          label: 'Readiness Review' },
  { id: 'ASSESSMENT_IN_PROGRESS',    label: 'Assessment In Progress' },
  { id: 'CONSULTATION_AND_APPROVAL', label: 'Consultation & Approval' },
  { id: 'APPROVED_AND_MONITORED',    label: 'Approved & Monitored' },
] as const

type DvrStatusId = typeof DVR_STATUSES[number]['id']

const STATUS_ORDER: Record<string, number> = Object.fromEntries(DVR_STATUSES.map((s, i) => [s.id, i]))

const REQUIRED_SIG_ROLES: { roleType: string; label: string; description: string }[] = [
  { roleType: 'EMPLOYER', label: 'Employer (Datore di Lavoro)',      description: 'Art. 17 D.Lgs. 81/2008 — non-delegable duty' },
  { roleType: 'RSPP',     label: 'RSPP',                             description: 'Responsabile Servizio Prevenzione e Protezione' },
  { roleType: 'RLS',      label: 'RLS / RLST',                       description: "Rappresentante dei Lavoratori per la Sicurezza" },
]

function nextStatus(current: string): DvrStatusId | null {
  const idx = STATUS_ORDER[current] ?? -1
  return idx < DVR_STATUSES.length - 1 ? DVR_STATUSES[idx + 1]!.id : null
}

// ─── Status stepper ───────────────────────────────────────────────────────────

function StatusStepper({ current }: { current: string }) {
  const currentIdx = STATUS_ORDER[current] ?? 0
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {DVR_STATUSES.map((s, idx) => {
        const isPast    = idx < currentIdx
        const isCurrent = idx === currentIdx
        return (
          <div key={s.id} className="flex items-center">
            <div className={`flex flex-col items-center min-w-[90px] ${isCurrent ? 'opacity-100' : isPast ? 'opacity-80' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                isCurrent ? 'border-blue-600 bg-blue-600 text-white'
                  : isPast ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
              }`}>
                {isPast
                  ? <CheckCircle2 className="w-4 h-4" />
                  : isCurrent
                    ? <Circle className="w-4 h-4 fill-white" />
                    : <span className="text-xs font-medium">{idx + 1}</span>}
              </div>
              <p className={`text-[10px] mt-1 text-center leading-tight max-w-[80px] ${isCurrent ? 'text-blue-700 font-semibold' : isPast ? 'text-green-700' : 'text-gray-400'}`}>
                {s.label}
              </p>
            </div>
            {idx < DVR_STATUSES.length - 1 && (
              <div className={`h-0.5 w-6 mx-0.5 flex-shrink-0 ${idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Sign dialog ──────────────────────────────────────────────────────────────

interface SignDialogProps {
  roleLabel:    string
  defaultName:  string
  onClose:      () => void
  onSign:       (signerName: string, notes: string) => Promise<void>
}

function SignDialog({ roleLabel, defaultName, onClose, onSign }: SignDialogProps) {
  const [name,  setName]  = useState(defaultName)
  const [notes, setNotes] = useState('')
  const [busy,  setBusy]  = useState(false)

  async function handleConfirm() {
    if (!name.trim()) { toast.error('Signer name is required'); return }
    setBusy(true)
    await onSign(name.trim(), notes.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Confirm Signature — {roleLabel}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Signer Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name of signatory" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any comments or reservations..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded p-2">
            By clicking &ldquo;Sign&rdquo;, you confirm that this DVR has been reviewed and meets the requirements of D.Lgs. 81/2008.
          </p>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Pen className="w-4 h-4 mr-1" />}
            Sign
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Signature card ───────────────────────────────────────────────────────────

interface SigCardProps {
  roleType:    string
  label:       string
  description: string
  signature:   ApprovalSignature | undefined
  appointeeName: string
  locked:      boolean
  onSign:      (roleType: string) => void
  onRemove:    (roleType: string) => void
}

function SignatureCard({ roleType, label, description, signature, appointeeName, locked, onSign, onRemove }: SigCardProps) {
  const isSigned = Boolean(signature)
  return (
    <div className={`rounded-lg border p-4 ${isSigned ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSigned ? 'bg-green-600' : 'bg-gray-200'}`}>
            {isSigned ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Pen className="w-4 h-4 text-gray-500" />}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            {appointeeName && !isSigned && (
              <p className="text-xs text-blue-600 mt-1">Appointed: {appointeeName}</p>
            )}
            {isSigned && signature && (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-xs font-medium text-green-700">Signed by: {signature.signerName}</p>
                <p className="text-xs text-green-600">{new Date(signature.signedAt).toLocaleString()}</p>
                {signature.notes && <p className="text-xs text-gray-500 italic">&ldquo;{signature.notes}&rdquo;</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!locked && isSigned && (
            <button
              type="button"
              onClick={() => onRemove(roleType)}
              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
              title="Remove signature"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!locked && !isSigned && (
            <Button type="button" size="sm" variant="outline" onClick={() => onSign(roleType)}>
              <Pen className="w-3.5 h-3.5 mr-1" />
              Sign
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  siteId:      string
  dvr:         DvrSetup | null
  safetyRoles: SafetyRole[]
  onChanged:   () => void
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApprovalTab({ siteId, dvr, safetyRoles, onChanged }: Props) {
  const [signatures,    setSignatures]    = useState<ApprovalSignature[]>([])
  const [loading,       setLoading]       = useState(true)
  const [advancing,     setAdvancing]     = useState(false)
  const [newCycle,      setNewCycle]      = useState(false)
  const [signRole,      setSignRole]      = useState<string | null>(null)
  const [removingRole,  setRemovingRole]  = useState<string | null>(null)
  const [overrideDialog, setOverrideDialog] = useState<string | null>(null)

  const loadSignatures = useCallback(async () => {
    if (!dvr) { setLoading(false); return }
    try {
      const res  = await fetch(`/api/sites/${siteId}/dvr/signatures`)
      const json = await res.json() as { ok: boolean; data: ApprovalSignature[] }
      if (json.ok) setSignatures(json.data)
    } catch {
      toast.error('Failed to load signatures')
    } finally {
      setLoading(false)
    }
  }, [siteId, dvr])

  useEffect(() => { void loadSignatures() }, [loadSignatures])

  const currentStatus = dvr?.status ?? 'SETUP'
  const isLocked      = currentStatus === 'APPROVED_AND_MONITORED'
  const next          = nextStatus(currentStatus)

  const sigMap  = Object.fromEntries(signatures.map((s) => [s.roleType, s]))
  const sigRoles = new Set(signatures.map((s) => s.roleType))
  const allSigned = sigRoles.has('EMPLOYER') && sigRoles.has('RSPP') && (sigRoles.has('RLS') || sigRoles.has('RLST'))

  function appointeeName(roleType: string): string {
    const role = safetyRoles.find((r) => r.roleType === roleType && r.isActive)
    return role?.employee?.fullName ?? role?.externalName ?? ''
  }

  async function handleSign(signerName: string, notes: string) {
    if (!signRole) return
    try {
      const res  = await fetch(`/api/sites/${siteId}/dvr/signatures`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleType: signRole, signerName, notes: notes || null }),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (!json.ok) { toast.error(json.message ?? 'Failed to sign'); return }
      toast.success('Signature recorded')
      void loadSignatures()
    } finally {
      setSignRole(null)
    }
  }

  async function handleRemove(roleType: string) {
    if (!confirm('Remove this signature?')) return
    setRemovingRole(roleType)
    try {
      const res  = await fetch(`/api/sites/${siteId}/dvr/signatures/${roleType}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) { toast.success('Signature removed'); void loadSignatures() }
      else toast.error(json.message ?? 'Failed to remove')
    } finally {
      setRemovingRole(null)
    }
  }

  async function advanceTo(targetStatus: string, overrideJustification?: string) {
    setAdvancing(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/dvr`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, overrideJustification }),
      })
      const json = await res.json() as { ok: boolean; code?: string; message?: string }
      if (json.ok) {
        toast.success(`Status advanced to: ${DVR_STATUSES.find((s) => s.id === targetStatus)?.label ?? targetStatus}`)
        setOverrideDialog(null)
        onChanged()
      } else if (json.code === 'GATE_BLOCKED') {
        setOverrideDialog(targetStatus)
      } else {
        toast.error(json.message ?? 'Failed to advance status')
      }
    } finally {
      setAdvancing(false)
    }
  }

  async function handleAdvance() {
    if (!next) return
    if (next === 'APPROVED_AND_MONITORED' && !allSigned) {
      toast.error('All three role signatures (Employer, RSPP, RLS) are required before approving.')
      return
    }
    await advanceTo(next)
  }

  async function handleNewCycle() {
    if (!confirm('This will increment the version and move the DVR back to Readiness Review. All current signatures will be cleared. Continue?')) return
    setNewCycle(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/dvr`, { method: 'POST' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) { toast.success('New review cycle started'); onChanged() }
      else toast.error(json.message ?? 'Failed to start new cycle')
    } finally {
      setNewCycle(false)
    }
  }

  if (!dvr) {
    return (
      <div className="text-center py-16 text-gray-400">
        <BadgeCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No DVR record found for this site.</p>
      </div>
    )
  }

  const signingRole = REQUIRED_SIG_ROLES.find((r) => r.roleType === signRole)

  return (
    <div className="space-y-6">
      {/* Lock banner */}
      {isLocked && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <Lock className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 text-sm">This DVR is approved and locked (v{dvr.version})</p>
            {dvr.approvedAt && (
              <p className="text-xs text-green-600 mt-0.5">
                Approved on {new Date(dvr.approvedAt).toLocaleDateString()}
                {dvr.approvedByName ? ` by ${dvr.approvedByName}` : ''}
              </p>
            )}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void handleNewCycle()} disabled={newCycle}>
            {newCycle ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
            Start New Review Cycle
          </Button>
        </div>
      )}

      {/* Info card */}
      <div className="border rounded-lg p-4 bg-gray-50 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Version</p>
          <p className="font-semibold text-gray-900 mt-0.5">v{dvr.version}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Document No.</p>
          <p className="font-semibold text-gray-900 mt-0.5">{dvr.documentNumber ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Assessment Date</p>
          <p className="font-medium text-gray-700 mt-0.5">{dvr.assessmentDate ? dvr.assessmentDate.slice(0, 10) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Next Review</p>
          <p className="font-medium text-gray-700 mt-0.5">{dvr.nextReviewDate ? dvr.nextReviewDate.slice(0, 10) : '—'}</p>
        </div>
      </div>

      {/* Status stepper */}
      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
          <Unlock className="w-4 h-4" />
          Status Progress
        </h3>
        <StatusStepper current={currentStatus} />
      </div>

      {/* Required signatures */}
      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
          <Pen className="w-4 h-4" />
          Required Signatures
          <span className="text-xs text-gray-400 font-normal ml-1">(Art. 28–29 D.Lgs. 81/2008)</span>
        </h3>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-3">
            {REQUIRED_SIG_ROLES.map((role) => (
              <SignatureCard
                key={role.roleType}
                roleType={role.roleType}
                label={role.label}
                description={role.description}
                signature={sigMap[role.roleType]}
                appointeeName={appointeeName(role.roleType)}
                locked={isLocked || removingRole === role.roleType}
                onSign={setSignRole}
                onRemove={(rt) => void handleRemove(rt)}
              />
            ))}
          </div>
        )}

        {!isLocked && !allSigned && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-3">
            All three signatures are required before the DVR can be moved to &ldquo;Approved &amp; Monitored&rdquo; status.
          </p>
        )}
        {!isLocked && allSigned && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 mt-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            All required signatures are in place. You may now advance to &ldquo;Approved &amp; Monitored&rdquo;.
          </p>
        )}
      </div>

      {/* Advance status */}
      {!isLocked && next && (
        <div className="border-t pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Next stage</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <ChevronRight className="w-3 h-3" />
              {DVR_STATUSES.find((s) => s.id === next)?.label}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void handleAdvance()}
            disabled={advancing || (next === 'APPROVED_AND_MONITORED' && !allSigned)}
          >
            {advancing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <BadgeCheck className="w-4 h-4 mr-1" />}
            Advance to Next Stage
          </Button>
        </div>
      )}

      {/* Sign dialog */}
      {signRole && signingRole && (
        <SignDialog
          roleLabel={signingRole.label}
          defaultName={appointeeName(signRole)}
          onClose={() => setSignRole(null)}
          onSign={handleSign}
        />
      )}

      {overrideDialog && (
        <OverrideDialog
          targetStatus={DVR_STATUSES.find((s) => s.id === overrideDialog)?.label ?? overrideDialog}
          onClose={() => setOverrideDialog(null)}
          onConfirm={(justification) => void advanceTo(overrideDialog, justification)}
          advancing={advancing}
        />
      )}
    </div>
  )
}

// ─── Override dialog ──────────────────────────────────────────────────────────

interface OverrideDialogProps {
  targetStatus: string
  onClose:      () => void
  onConfirm:    (justification: string) => void
  advancing:    boolean
}

function OverrideDialog({ targetStatus, onClose, onConfirm, advancing }: OverrideDialogProps) {
  const [justification, setJustification] = useState('')

  function handleConfirm() {
    if (justification.trim().length < 10) {
      toast.error('Justification must be at least 10 characters.')
      return
    }
    onConfirm(justification.trim())
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h2 className="font-semibold text-amber-700">Override Required</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Not all readiness gates have passed. To advance to &ldquo;{targetStatus}&rdquo; you must provide a
            documented justification (minimum 10 characters).
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Justification *</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              placeholder="Explain why this DVR can advance despite incomplete gate checks..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={advancing}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={advancing} className="bg-amber-600 hover:bg-amber-700">
            {advancing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Override &amp; Advance
          </Button>
        </div>
      </div>
    </div>
  )
}
