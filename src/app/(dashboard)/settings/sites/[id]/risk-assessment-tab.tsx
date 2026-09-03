'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HazardRow {
  id:                  string
  hazardCode:          string
  justification:       string | null
  processName:         string
  activityName:        string
  taskId:              string
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

interface ApiScreening {
  id:                  string
  hazardCode:          string
  justification:       string | null
  probability:         number | null
  damage:              number | null
  riskLevel:           number | null
  riskClass:           string | null
  mitigationMeasures:  string | null
  residualProbability: number | null
  residualDamage:      number | null
  residualRiskLevel:   number | null
  residualRiskClass:   string | null
  task: {
    id:   string
    name: string
    activity: {
      id:   string
      name: string
      process: {
        id:   string
        name: string
      }
    }
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HAZARD_LABELS: Record<string, string> = {
  R01: 'Falls from height',
  R02: 'Slips, trips and falls on the same level',
  R03: 'Struck by moving objects',
  R04: 'Struck against objects',
  R05: 'Contact with moving machinery',
  R06: 'Cuts, punctures and abrasions',
  R07: 'Manual handling and musculoskeletal disorders',
  R08: 'Chemical agents',
  R09: 'Biological agents',
  R10: 'Noise and vibration',
  R11: 'Extreme temperatures (heat/cold)',
  R12: 'Electrical hazards',
  R13: 'Fire and explosion',
  R14: 'Radiation (ionising / non-ionising)',
  R15: 'Confined spaces',
  R16: 'Ergonomic hazards (repetitive strain)',
  R17: 'Psychosocial hazards (stress, harassment)',
  R18: 'Work at height — scaffolding and temporary works',
  R19: 'Driving and transport (road risk)',
  R20: 'Contractor and third-party interaction',
  R21: 'Environmental hazards (dust, fumes, emissions)',
  R22: 'Emergency situations and natural hazards',
}

const P_LABELS: Record<number, string> = {
  1: '1 — Improbable',
  2: '2 — Unlikely',
  3: '3 — Possible',
  4: '4 — Probable',
}

const D_LABELS: Record<number, string> = {
  1: '1 — Minor',
  2: '2 — Moderate',
  3: '3 — Severe',
  4: '4 — Fatal',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskClass(p: number | null, d: number | null): string | null {
  if (p === null || d === null) return null
  const r = p * d
  if (r <= 3)  return 'LOW'
  if (r <= 8)  return 'MEDIUM'
  return 'HIGH'
}

function RiskBadge({ cls }: { cls: string | null }) {
  if (!cls) return <span className="text-gray-400 text-xs">—</span>
  const colors =
    cls === 'LOW'    ? 'bg-green-100 text-green-800' :
    cls === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
    'bg-red-100 text-red-800'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${colors}`}>
      {cls}
    </span>
  )
}

// ─── HazardRow component ──────────────────────────────────────────────────────

interface HazardRowProps {
  siteId:   string
  row:      HazardRow
  onSaved:  (updated: HazardRow) => void
}

function HazardRowItem({ siteId, row, onSaved }: HazardRowProps) {
  const t = useTranslations('sites')

  const [p,  setP]  = useState<number | null>(row.probability)
  const [d,  setD]  = useState<number | null>(row.damage)
  const [mit, setMit] = useState<string>(row.mitigationMeasures ?? '')
  const [rp, setRp] = useState<number | null>(row.residualProbability)
  const [rd, setRd] = useState<number | null>(row.residualDamage)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const computedR  = (p !== null && d !== null) ? p * d : null
  const computedRC = riskClass(p, d)
  const computedRR = (rp !== null && rd !== null) ? rp * rd : null
  const computedRRC = riskClass(rp, rd)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/tasks/${row.taskId}/hazards/${row.hazardCode}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          probability:         p,
          damage:              d,
          mitigationMeasures:  mit || null,
          residualProbability: rp,
          residualDamage:      rd,
        }),
      })
      const json = await res.json() as { ok: boolean; message?: string; code?: string }
      if (json.ok) {
        toast.success(t('riskAssessment.saved'))
        onSaved({
          ...row,
          probability:         p,
          damage:              d,
          riskLevel:           computedR,
          riskClass:           computedRC,
          mitigationMeasures:  mit || null,
          residualProbability: rp,
          residualDamage:      rd,
          residualRiskLevel:   computedRR,
          residualRiskClass:   computedRRC,
        })
      } else {
        toast.error(json.message ?? `Save failed (${json.code ?? 'UNKNOWN'})`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errorSaving')
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-lg mb-2 overflow-hidden">
      {/* Collapsed row */}
      <div
        className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-white items-center cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="col-span-1 flex items-center gap-1">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          }
          <span className="text-xs font-bold text-blue-700">{row.hazardCode}</span>
        </div>
        <div className="col-span-4">
          <p className="text-sm font-medium text-gray-800 leading-tight">
            {HAZARD_LABELS[row.hazardCode] ?? row.hazardCode}
          </p>
          <p className="text-xs text-gray-400">{row.taskName}</p>
        </div>
        <div className="col-span-1 text-center">
          <span className="text-sm">{p ?? <span className="text-gray-300">—</span>}</span>
        </div>
        <div className="col-span-1 text-center">
          <span className="text-sm">{d ?? <span className="text-gray-300">—</span>}</span>
        </div>
        <div className="col-span-1 text-center">
          <span className="text-sm font-bold">{computedR ?? <span className="text-gray-300">—</span>}</span>
        </div>
        <div className="col-span-2 text-center">
          <RiskBadge cls={computedRC} />
        </div>
        <div className="col-span-1 text-center">
          <span className="text-xs">{rp ?? <span className="text-gray-300">—</span>}</span>
        </div>
        <div className="col-span-1 text-center">
          <span className="text-xs">{rd ?? <span className="text-gray-300">—</span>}</span>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
          {row.justification && (
            <p className="text-xs text-gray-500 italic">{t('riskAssessment.justification')}: {row.justification}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            {/* Initial risk */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">{t('riskAssessment.initialRisk')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('riskAssessment.probability')} (P)</label>
                  <select
                    value={p ?? ''}
                    onChange={(e) => setP(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((v) => (
                      <option key={v} value={v}>{P_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('riskAssessment.damage')} (D)</label>
                  <select
                    value={d ?? ''}
                    onChange={(e) => setD(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((v) => (
                      <option key={v} value={v}>{D_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('riskAssessment.riskLevel')}:</span>
                <span className="text-sm font-bold">{computedR ?? '—'}</span>
                <RiskBadge cls={computedRC} />
              </div>
            </div>

            {/* Residual risk */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">{t('riskAssessment.residualRisk')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('riskAssessment.residualP')}</label>
                  <select
                    value={rp ?? ''}
                    onChange={(e) => setRp(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((v) => (
                      <option key={v} value={v}>{P_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t('riskAssessment.residualD')}</label>
                  <select
                    value={rd ?? ''}
                    onChange={(e) => setRd(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4].map((v) => (
                      <option key={v} value={v}>{D_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('riskAssessment.residualRiskLevel')}:</span>
                <span className="text-sm font-bold">{computedRR ?? '—'}</span>
                <RiskBadge cls={computedRRC} />
              </div>
            </div>
          </div>

          {/* Mitigation measures */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('riskAssessment.mitigation')}</label>
            <textarea
              value={mit}
              onChange={(e) => setMit(e.target.value)}
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('riskAssessment.mitigationPlaceholder')}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('riskAssessment.saveRow')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RiskAssessmentTabProps {
  siteId: string
}

export function RiskAssessmentTab({ siteId }: RiskAssessmentTabProps) {
  const t = useTranslations('sites')
  const [rows, setRows]       = useState<HazardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts]   = useState({ applicable: 0, assessed: 0 })

  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/risk-assessment`)
      const json = await res.json() as {
        ok: boolean
        data: { screenings: ApiScreening[]; applicableCount: number; assessedCount: number }
      }
      if (json.ok) {
        const mapped: HazardRow[] = json.data.screenings.map((s) => ({
          id:                  s.id,
          hazardCode:          s.hazardCode,
          justification:       s.justification,
          processName:         s.task.activity.process.name,
          activityName:        s.task.activity.name,
          taskId:              s.task.id,
          taskName:            s.task.name,
          probability:         s.probability,
          damage:              s.damage,
          riskLevel:           s.riskLevel,
          riskClass:           s.riskClass,
          mitigationMeasures:  s.mitigationMeasures,
          residualProbability: s.residualProbability,
          residualDamage:      s.residualDamage,
          residualRiskLevel:   s.residualRiskLevel,
          residualRiskClass:   s.residualRiskClass,
        }))
        setRows(mapped)
        setCounts({ applicable: json.data.applicableCount, assessed: json.data.assessedCount })

        // Auto-expand all processes
        const processes = new Set(mapped.map((r) => r.processName))
        setExpandedProcesses(processes)
      }
    } catch {
      toast.error(t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [siteId, t])

  useEffect(() => { void load() }, [load])

  function handleSaved(updated: HazardRow) {
    setRows((prev) => prev.map((r) => r.id === updated.id ? updated : r))
    // Recount
    setRows((prev) => {
      const assessed = prev.filter((r) => r.probability !== null && r.damage !== null).length
      setCounts({ applicable: prev.length, assessed })
      return prev
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t('riskAssessment.noApplicableHazards')}</p>
        <p className="text-xs mt-1 text-gray-300">{t('riskAssessment.noApplicableHint')}</p>
      </div>
    )
  }

  // Group by process
  const byProcess = rows.reduce<Record<string, HazardRow[]>>((acc, row) => {
    if (!acc[row.processName]) acc[row.processName] = []
    acc[row.processName]!.push(row)
    return acc
  }, {})

  const progressPct = counts.applicable > 0
    ? Math.round((counts.assessed / counts.applicable) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">
            {t('riskAssessment.progress', { assessed: counts.assessed, total: counts.applicable })}
          </p>
          <span className="text-sm font-bold text-blue-600">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('riskAssessment.progressHint')}</p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="col-span-5">{t('riskAssessment.hazard')}</div>
        <div className="col-span-1 text-center">P</div>
        <div className="col-span-1 text-center">D</div>
        <div className="col-span-1 text-center">R</div>
        <div className="col-span-2 text-center">{t('riskAssessment.riskClass')}</div>
        <div className="col-span-1 text-center">rP</div>
        <div className="col-span-1 text-center">rD</div>
      </div>

      {/* Hazard rows grouped by process */}
      {Object.entries(byProcess).map(([processName, processRows]) => (
        <div key={processName} className="space-y-1">
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => setExpandedProcesses((prev) => {
              const next = new Set(prev)
              if (next.has(processName)) next.delete(processName)
              else next.add(processName)
              return next
            })}
          >
            {expandedProcesses.has(processName)
              ? <ChevronDown className="w-4 h-4 text-gray-500" />
              : <ChevronRight className="w-4 h-4 text-gray-500" />
            }
            <span className="text-sm font-semibold text-gray-700">{processName}</span>
            <span className="text-xs text-gray-400">({processRows.length} {t('riskAssessment.hazards')})</span>
          </button>

          {expandedProcesses.has(processName) && (
            <div className="pl-4">
              {processRows.map((row) => (
                <HazardRowItem
                  key={row.id}
                  siteId={siteId}
                  row={row}
                  onSaved={handleSaved}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
