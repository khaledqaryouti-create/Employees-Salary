'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Clock, Save, AlertTriangle, Calendar, RotateCcw,
  Calculator, ShieldCheck, Users, Banknote, DollarSign,
} from 'lucide-react'

interface OvertimeTypeRules {
  id: string
  name: string
  nameAr: string | null
  description: string | null
  isActive: boolean
  // Hours & Amount Limits
  maxHoursDaily: number | null
  maxHoursWeekly: number | null
  maxHoursMonthly: number | null
  maxAmountDaily: number | null
  maxAmountWeekly: number | null
  maxAmountMonthly: number | null
  maxAmountPercentSalary: number | null
  upperLimitAction: string | null
  // Budget
  budgetLimitEnabled: boolean
  budgetHierarchy: string | null
  // Work Week & Calendar
  workWeekStart: string | null
  workWeekEnd: string | null
  workingDaysPerMonth: number | null
  excludeWeekendsFromCalendar: boolean
  shiftBasedWorkingDays: boolean
  workingHoursPerDay: number | null
  // Rounding & Entry
  roundingRule: string | null
  payWithRounding: boolean
  entryFormat: string | null
  autoCalcEnabled: boolean
  // Rate & Calculation
  baseSalaryMultiplier: number | null
  fixedRateEnabled: boolean
  fixedRateAmount: number | null
  includeHousing: boolean
  conversionEnabled: boolean
  conversionHoursPerDay: number | null
  // Validation & Overlap
  otSourceType: string | null
  validateLimitsAt: string | null
  checkOverlap: boolean
  backDateLimitDays: number | null
  allowMultiplePerDay: boolean
  // Shift & Schedule
  shiftEndDelayMinutes: number | null
  restrictToShift: boolean
  restrictToShiftPeriod: boolean
  requestDaysRestriction: string | null
  // Attachments, Reason & ESS
  attachmentMandatory: boolean
  reasonMandatory: boolean
  essRestricted: boolean
  nonPayrollRouting: boolean
  nonPayrollCode: string | null
  // Salary Calculation
  includeInSalaryCalc: boolean
  salaryCalcMethod: string | null
  includeBasicSalary: boolean
  salaryCalcNote: string | null
}

type FormState = Omit<OvertimeTypeRules, 'id' | 'name' | 'nameAr' | 'description' | 'isActive'>

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0 w-56">
        {children}
      </div>
    </div>
  )
}

function NumInput({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <Input
      type="number"
      min={0}
      step="any"
      placeholder={placeholder ?? '—'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="h-8 text-sm"
    />
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <FieldRow label={label} hint={hint}>
      <div className="flex justify-end">
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </FieldRow>
  )
}

export default function OvertimeRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [typeName, setTypeName] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const [form, setForm] = useState<FormState>({
    maxHoursDaily: null, maxHoursWeekly: null, maxHoursMonthly: null,
    maxAmountDaily: null, maxAmountWeekly: null, maxAmountMonthly: null,
    maxAmountPercentSalary: null, upperLimitAction: null,
    budgetLimitEnabled: false, budgetHierarchy: null,
    workWeekStart: null, workWeekEnd: null, workingDaysPerMonth: null,
    excludeWeekendsFromCalendar: false, shiftBasedWorkingDays: false, workingHoursPerDay: null,
    roundingRule: null, payWithRounding: false, entryFormat: null, autoCalcEnabled: false,
    baseSalaryMultiplier: null, fixedRateEnabled: false, fixedRateAmount: null,
    includeHousing: false, conversionEnabled: false, conversionHoursPerDay: null,
    otSourceType: null, validateLimitsAt: null, checkOverlap: true,
    backDateLimitDays: null, allowMultiplePerDay: true,
    shiftEndDelayMinutes: null, restrictToShift: false, restrictToShiftPeriod: false,
    requestDaysRestriction: null,
    attachmentMandatory: false, reasonMandatory: false,
    essRestricted: false, nonPayrollRouting: false, nonPayrollCode: null,
    includeInSalaryCalc: true, salaryCalcMethod: null,
    includeBasicSalary: true, salaryCalcNote: null,
  })

  useEffect(() => {
    fetch(`/api/overtime-types/${id}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; data?: OvertimeTypeRules }) => {
        if (!j.data) return
        setTypeName(j.data.name)
        const { id: _id, name: _name, nameAr: _nameAr, description: _desc, isActive: _active, ...rest } = j.data
        setForm(rest as FormState)
      })
      .catch(() => toast.error('Failed to load rules'))
      .finally(() => setLoading(false))
  }, [id])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/overtime-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Failed to save'); return }
      toast.success('Rules saved successfully')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/settings/overtime-types')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            {typeName} — Overtime Rules
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Configure hours limits, rates, validation, and salary calculation for this overtime type
          </p>
        </div>
      </div>

      {/* Section 1 — Hours & Amount Limits */}
      <SectionCard title="Hours & Amount Limits" icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}>
        <FieldRow label="Max Daily Hours" hint="Maximum overtime hours allowed per day">
          <NumInput value={form.maxHoursDaily} onChange={(v) => set('maxHoursDaily', v)} placeholder="e.g. 2" />
        </FieldRow>
        <FieldRow label="Max Weekly Hours" hint="Maximum overtime hours allowed per week">
          <NumInput value={form.maxHoursWeekly} onChange={(v) => set('maxHoursWeekly', v)} placeholder="e.g. 10" />
        </FieldRow>
        <FieldRow label="Max Monthly Hours" hint="Maximum overtime hours allowed per month">
          <NumInput value={form.maxHoursMonthly} onChange={(v) => set('maxHoursMonthly', v)} placeholder="e.g. 40" />
        </FieldRow>
        <FieldRow label="Max Daily Amount" hint="Monetary cap per day">
          <NumInput value={form.maxAmountDaily} onChange={(v) => set('maxAmountDaily', v)} placeholder="SAR" />
        </FieldRow>
        <FieldRow label="Max Weekly Amount" hint="Monetary cap per week">
          <NumInput value={form.maxAmountWeekly} onChange={(v) => set('maxAmountWeekly', v)} placeholder="SAR" />
        </FieldRow>
        <FieldRow label="Max Monthly Amount" hint="Monetary cap per month">
          <NumInput value={form.maxAmountMonthly} onChange={(v) => set('maxAmountMonthly', v)} placeholder="SAR" />
        </FieldRow>
        <FieldRow label="Max Amount (% of Salary)" hint="Cap OT amount as a percentage of base salary">
          <NumInput value={form.maxAmountPercentSalary} onChange={(v) => set('maxAmountPercentSalary', v)} placeholder="e.g. 5" />
        </FieldRow>
        <FieldRow label="When Limit Exceeded" hint="Action to take when upper limit is reached">
          <Select value={form.upperLimitAction ?? ''} onValueChange={(v) => set('upperLimitAction', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REJECT">Reject Entire Request</SelectItem>
              <SelectItem value="PARTIAL_POST">Allow Partial Post</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SectionCard>

      {/* Section 2 — Budget */}
      <SectionCard title="Budget" icon={<Banknote className="w-4 h-4 text-yellow-600" />}>
        <ToggleRow
          label="Enable Budget Limitation"
          hint="Block overtime if department/branch budget is exceeded"
          checked={form.budgetLimitEnabled}
          onChange={(v) => set('budgetLimitEnabled', v)}
        />
        <FieldRow label="Budget Hierarchy" hint="Level at which budget is checked">
          <Select value={form.budgetHierarchy ?? ''} onValueChange={(v) => set('budgetHierarchy', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PROFIT_CENTER">Profit Center</SelectItem>
              <SelectItem value="BRANCH">Branch</SelectItem>
              <SelectItem value="DEPARTMENT">Department</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SectionCard>

      {/* Section 3 — Work Week & Calendar */}
      <SectionCard title="Work Week & Calendar" icon={<Calendar className="w-4 h-4 text-blue-500" />}>
        <FieldRow label="Work Week Start" hint="First day of the OT calculation week">
          <Select value={form.workWeekStart ?? ''} onValueChange={(v) => set('workWeekStart', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select day" /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => <SelectItem key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Work Week End" hint="Last day of the OT calculation week">
          <Select value={form.workWeekEnd ?? ''} onValueChange={(v) => set('workWeekEnd', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select day" /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => <SelectItem key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Working Days per Month" hint="Standard working days used for rate calculation">
          <NumInput value={form.workingDaysPerMonth} onChange={(v) => set('workingDaysPerMonth', v ? Math.round(v) : null)} placeholder="e.g. 30" />
        </FieldRow>
        <FieldRow label="Working Hours per Day" hint="Standard daily working hours">
          <NumInput value={form.workingHoursPerDay} onChange={(v) => set('workingHoursPerDay', v)} placeholder="e.g. 8" />
        </FieldRow>
        <ToggleRow
          label="Exclude Weekends from Calendar"
          hint="Use 22 working days instead of 30 for rate calculation"
          checked={form.excludeWeekendsFromCalendar}
          onChange={(v) => set('excludeWeekendsFromCalendar', v)}
        />
        <ToggleRow
          label="Shift-Based Working Days"
          hint="Determine working days from the employee's assigned shift"
          checked={form.shiftBasedWorkingDays}
          onChange={(v) => set('shiftBasedWorkingDays', v)}
        />
      </SectionCard>

      {/* Section 4 — Rounding & Entry */}
      <SectionCard title="Rounding & Entry" icon={<RotateCcw className="w-4 h-4 text-purple-500" />}>
        <FieldRow label="Rounding Rule" hint="How overtime duration is rounded">
          <Select value={form.roundingRule ?? ''} onValueChange={(v) => set('roundingRule', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select rule" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No Rounding</SelectItem>
              <SelectItem value="NEAREST_15">Round to Nearest 15 min</SelectItem>
              <SelectItem value="NEAREST_30">Round to Nearest 30 min</SelectItem>
              <SelectItem value="NEAREST_60">Round to Nearest 60 min</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <ToggleRow
          label="Apply Rounding to Payout"
          hint="Round hours when calculating OT pay"
          checked={form.payWithRounding}
          onChange={(v) => set('payWithRounding', v)}
        />
        <FieldRow label="Entry Format" hint="How employees enter OT hours">
          <Select value={form.entryFormat ?? ''} onValueChange={(v) => set('entryFormat', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="HH_MM">HH:MM (e.g. 2:30)</SelectItem>
              <SelectItem value="DECIMAL">Decimal (e.g. 2.5)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <ToggleRow
          label="Enable Auto OT Calculation"
          hint="Automatically calculate OT from time attendance data"
          checked={form.autoCalcEnabled}
          onChange={(v) => set('autoCalcEnabled', v)}
        />
      </SectionCard>

      {/* Section 5 — Rate & Calculation */}
      <SectionCard title="Rate & Calculation" icon={<Calculator className="w-4 h-4 text-green-600" />}>
        <FieldRow label="Base Salary Multiplier" hint="Fraction of hourly rate (e.g. 0.5 = half the hourly rate)">
          <NumInput value={form.baseSalaryMultiplier} onChange={(v) => set('baseSalaryMultiplier', v)} placeholder="e.g. 0.5" />
        </FieldRow>
        <ToggleRow
          label="Use Fixed Rate"
          hint="Pay a flat amount per hour instead of salary-based rate"
          checked={form.fixedRateEnabled}
          onChange={(v) => set('fixedRateEnabled', v)}
        />
        {form.fixedRateEnabled && (
          <FieldRow label="Fixed Rate Amount (SAR/hr)" hint="Flat hourly rate for overtime pay">
            <NumInput value={form.fixedRateAmount} onChange={(v) => set('fixedRateAmount', v)} placeholder="e.g. 30" />
          </FieldRow>
        )}
        <ToggleRow
          label="Include Housing in OT Pay"
          hint="Add housing accrual to overtime calculation"
          checked={form.includeHousing}
          onChange={(v) => set('includeHousing', v)}
        />
        <ToggleRow
          label="Enable OT-to-Leave Conversion"
          hint="Allow overtime hours to be converted to time off"
          checked={form.conversionEnabled}
          onChange={(v) => set('conversionEnabled', v)}
        />
        {form.conversionEnabled && (
          <FieldRow label="Hours per Day (Conversion)" hint="How many OT hours equal one day off">
            <NumInput value={form.conversionHoursPerDay} onChange={(v) => set('conversionHoursPerDay', v)} placeholder="e.g. 8" />
          </FieldRow>
        )}
      </SectionCard>

      {/* Section 6 — Validation & Overlap */}
      <SectionCard title="Validation & Overlap" icon={<ShieldCheck className="w-4 h-4 text-indigo-500" />}>
        <FieldRow label="OT Source Type" hint="Where overtime entries originate from">
          <Select value={form.otSourceType ?? ''} onValueChange={(v) => set('otSourceType', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual Entry</SelectItem>
              <SelectItem value="LEAVE_TIME_DIFF">Leave Time Difference</SelectItem>
              <SelectItem value="TIME_ATTENDANCE">Time Attendance Module</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Validate Limits At" hint="When to check hours/amount caps">
          <Select value={form.validateLimitsAt ?? ''} onValueChange={(v) => set('validateLimitsAt', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select trigger" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REQUEST_SAVE">On Request Save</SelectItem>
              <SelectItem value="APPROVAL">On Approval</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <ToggleRow
          label="Check for Overlapping Requests"
          hint="Disallow duplicate OT requests for the same time period"
          checked={form.checkOverlap}
          onChange={(v) => set('checkOverlap', v)}
        />
        <FieldRow label="Back-Date Limit (Days)" hint="How many days back an OT entry can be submitted">
          <NumInput value={form.backDateLimitDays} onChange={(v) => set('backDateLimitDays', v ? Math.round(v) : null)} placeholder="e.g. 1" />
        </FieldRow>
        <ToggleRow
          label="Allow Multiple Entries per Day"
          hint="Permit more than one OT request for the same day (e.g. morning + evening)"
          checked={form.allowMultiplePerDay}
          onChange={(v) => set('allowMultiplePerDay', v)}
        />
      </SectionCard>

      {/* Section 7 — Shift, ESS & Policy */}
      <SectionCard title="Shift, ESS & Policy" icon={<Users className="w-4 h-4 text-rose-500" />}>
        <FieldRow label="Shift End Delay (Minutes)" hint="OT starts this many minutes after the shift ends">
          <NumInput value={form.shiftEndDelayMinutes} onChange={(v) => set('shiftEndDelayMinutes', v ? Math.round(v) : null)} placeholder="e.g. 10" />
        </FieldRow>
        <ToggleRow
          label="Restrict to Assigned Shift"
          hint="Only allow OT for employees on a specific shift"
          checked={form.restrictToShift}
          onChange={(v) => set('restrictToShift', v)}
        />
        <ToggleRow
          label="Restrict to Shift Period"
          hint="No OT allowed outside of working hours"
          checked={form.restrictToShiftPeriod}
          onChange={(v) => set('restrictToShiftPeriod', v)}
        />
        <FieldRow label="Allowed Request Days" hint="Which days OT requests can be submitted for">
          <Select value={form.requestDaysRestriction ?? ''} onValueChange={(v) => set('requestDaysRestriction', v || null)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select restriction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Days</SelectItem>
              <SelectItem value="HOLIDAYS_ONLY">Holidays Only</SelectItem>
              <SelectItem value="WEEKDAYS_ONLY">Weekdays Only</SelectItem>
              <SelectItem value="WEEKENDS_ONLY">Weekends Only</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <ToggleRow
          label="Attachment is Mandatory"
          hint="Require a supporting document with each OT request"
          checked={form.attachmentMandatory}
          onChange={(v) => set('attachmentMandatory', v)}
        />
        <ToggleRow
          label="Reason is Mandatory"
          hint="Force employees to provide justification for OT"
          checked={form.reasonMandatory}
          onChange={(v) => set('reasonMandatory', v)}
        />
        <ToggleRow
          label="Block Employee Self Service"
          hint="Only HR/Admin can submit OT — employees cannot use ESS"
          checked={form.essRestricted}
          onChange={(v) => set('essRestricted', v)}
        />
        <ToggleRow
          label="Non-Payroll Routing"
          hint="Route OT through ESS/Time Attendance only, not payroll"
          checked={form.nonPayrollRouting}
          onChange={(v) => set('nonPayrollRouting', v)}
        />
        {form.nonPayrollRouting && (
          <FieldRow label="Non-Payroll Code" hint="Code used when routing outside payroll">
            <Input
              className="h-8 text-sm"
              placeholder="e.g. NP-OT-001"
              value={form.nonPayrollCode ?? ''}
              onChange={(e) => set('nonPayrollCode', e.target.value || null)}
            />
          </FieldRow>
        )}
      </SectionCard>

      {/* Section 8 — Salary Calculation */}
      <SectionCard title="Salary Calculation" icon={<DollarSign className="w-4 h-4 text-emerald-600" />}>
        <ToggleRow
          label="Include in Salary Calculation"
          hint="Master switch — controls whether this OT type flows into payroll"
          checked={form.includeInSalaryCalc}
          onChange={(v) => set('includeInSalaryCalc', v)}
        />
        {form.includeInSalaryCalc && (
          <>
            <FieldRow label="Calculation Method" hint="How the OT monetary value is derived">
              <Select value={form.salaryCalcMethod ?? ''} onValueChange={(v) => set('salaryCalcMethod', v || null)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLIER">Salary Multiplier (e.g. 0.5×)</SelectItem>
                  <SelectItem value="FIXED_RATE">Fixed Hourly Rate (SAR/hr)</SelectItem>
                  <SelectItem value="FORMULA">Custom Formula</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <ToggleRow
              label="Include Basic Salary"
              hint="Include basic salary in OT hourly rate calculation"
              checked={form.includeBasicSalary}
              onChange={(v) => set('includeBasicSalary', v)}
            />
            <FieldRow label="Payroll Note" hint="Visible to the payroll team — explain any special handling">
              <Input
                className="h-8 text-sm"
                placeholder="e.g. Apply only in month of Ramadan"
                value={form.salaryCalcNote ?? ''}
                onChange={(e) => set('salaryCalcNote', e.target.value || null)}
              />
            </FieldRow>
          </>
        )}
      </SectionCard>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push('/settings/overtime-types')}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
