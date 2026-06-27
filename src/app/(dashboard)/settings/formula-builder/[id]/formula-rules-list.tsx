'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRuleEditor } from './use-rule-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Save,
  Play,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import type { Prisma } from '@prisma/client'

type Rule = Prisma.PayrollRuleGetPayload<Record<string, never>>
type Variable = Prisma.FormulaVariableGetPayload<Record<string, never>>

interface AllowanceTypeOption {
  id: string
  name: string
}

interface Props {
  readonly ruleSetId: string
  readonly rules: Rule[]
  readonly variables: Variable[]
  readonly allowanceTypes: AllowanceTypeOption[]
  readonly isDefault: boolean
  readonly organizationId: string | null
  readonly ruleSetOrgId: string | null
}

const DEFAULT_CONTEXT = {
  basicSalary: 5000,
  grossSalary: 7500,
  yearsOfService: 3,
  monthsOfService: 36,
  age: 30,
  daysInMonth: 30,
  workedDays: 30,
  unpaidLeaveDays: 0,
}

export function FormulaRulesList({ ruleSetId, rules: initialRules, variables, allowanceTypes, isDefault, ruleSetOrgId, organizationId }: Props) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [testContext, setTestContext] = useState(DEFAULT_CONTEXT)

  const canEdit = !isDefault || ruleSetOrgId === organizationId

  const {
    rules,
    editingId,
    saving,
    previewResults,
    previewLoading,
    setEditingId,
    saveRule,
    testFormula,
    runAllPreviews,
    addRule,
  } = useRuleEditor({ initialRules, testContext })

  return (
    <div className="space-y-6">
      {/* Test Context Panel */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Test Variables</CardTitle>
            <Button size="sm" variant="outline" onClick={runAllPreviews} disabled={previewLoading}>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {previewLoading ? 'Running…' : 'Run All Previews'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(testContext).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-gray-500">{key}</Label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setTestContext((prev) => ({ ...prev, [key]: Number.parseFloat(e.target.value) || 0 }))}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Rules ({rules.length})
          </h2>
          {canEdit && (
            <Button size="sm" onClick={() => setShowNewForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Rule
            </Button>
          )}
        </div>

        {!canEdit && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <Info className="w-4 h-4 shrink-0" />
            This is a default rule set. Clone it to create a customized version for your organization.
          </div>
        )}

        {rules.map((rule, idx) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            index={idx + 1}
            variables={variables}
            previewResult={previewResults[rule.id] ?? null}
            isEditing={editingId === rule.id}
            isSaving={saving === rule.id}
            canEdit={canEdit}
            onEdit={() => setEditingId(editingId === rule.id ? null : rule.id)}
            onSave={(data) => saveRule(rule.id, data)}
            onPreview={(formula) => testFormula(formula, rule.id)}
          />
        ))}

        {rules.length === 0 && !showNewForm && (
          <Card className="border-0 shadow-sm border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-10">
              <p className="text-gray-400 text-sm">No rules yet. Add your first rule to get started.</p>
            </CardContent>
          </Card>
        )}

        {showNewForm && canEdit && (
          <NewRuleForm
            ruleSetId={ruleSetId}
            variables={variables}
            allowanceTypes={allowanceTypes}
            onSaved={(newRule) => {
              addRule(newRule)
              toast.success('Rule added. You can add another or press Done when finished.')
            }}
            onCancel={() => setShowNewForm(false)}
          />
        )}
      </div>
    </div>
  )
}

interface RuleCardProps {
  readonly rule: Rule
  readonly index: number
  readonly variables: Variable[]
  readonly previewResult: { value: number | null; error: string | null } | null
  readonly isEditing: boolean
  readonly isSaving: boolean
  readonly canEdit: boolean
  readonly onEdit: () => void
  readonly onSave: (data: Partial<Rule>) => void
  readonly onPreview: (formula: string) => void
}

function RuleCard({
  rule,
  index,
  variables,
  previewResult,
  isEditing,
  isSaving,
  canEdit,
  onEdit,
  onSave,
  onPreview,
}: RuleCardProps) {
  const [formula, setFormula] = useState(rule.formula)

  const typeColors: Record<string, string> = {
    EARNING: 'bg-green-100 text-green-700',
    DEDUCTION: 'bg-red-100 text-red-700',
    EMPLOYER_COST: 'bg-blue-100 text-blue-700',
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        {/* Header row */}
        <button
          type="button"
          className="flex items-center gap-3 cursor-pointer w-full text-left bg-transparent border-0 p-0"
          onClick={canEdit ? onEdit : undefined}
          disabled={!canEdit}
        >
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
            {index}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{rule.name}</p>
            <code className="text-xs text-gray-400 font-mono truncate block">{rule.formula}</code>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`text-xs ${typeColors[rule.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {rule.type.replaceAll('_', ' ')}
            </Badge>
            {previewResult && (
              <span className={`text-xs font-mono font-semibold ${previewResult.error ? 'text-red-500' : 'text-green-600'}`}>
                {previewResult.error ? '⚠ Error' : `= ${previewResult.value?.toLocaleString()}`}
              </span>
            )}
            {canEdit && (
              isEditing ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* Edit panel */}
        {isEditing && canEdit && (
          <>
            <Separator className="my-4" />
            <Tabs defaultValue="formula">
              <TabsList className="mb-4">
                <TabsTrigger value="formula">Formula</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="formula" className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Formula expression</Label>
                  <Input
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="basicSalary * gosiRate / 100"
                  />
                  <p className="text-xs text-gray-400">
                    Use any variable from the Variables tab. Supports +, -, *, /, (), max(), min(), round(), floor()
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPreview(formula)}
                    className="flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSaving}
                    onClick={() => onSave({ formula })}
                    className="flex items-center gap-1.5"
                  >
                    <Save className="w-3 h-3" />
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="variables">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {variables.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className="text-left p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                      onClick={() => setFormula((f) => f + v.key)}
                    >
                      <code className="text-xs font-mono text-blue-600">{v.key}</code>
                      <p className="text-xs text-gray-500 mt-0.5">{v.description ?? v.label}</p>
                    </button>
                  ))}
                  {variables.length === 0 && (
                    <p className="text-xs text-gray-400 col-span-2">No variables configured yet.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="preview">
                {previewResult ? (
                  <div className={`rounded-lg p-4 ${previewResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                    {previewResult.error ? (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-700">Formula Error</p>
                          <p className="text-xs text-red-600 mt-1">{previewResult.error}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-700">Result</p>
                          <p className="text-2xl font-bold text-green-800 mt-1">
                            {previewResult.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">Click &quot;Test&quot; in the Formula tab to see the result</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

interface NewRuleFormProps {
  readonly ruleSetId: string
  readonly variables: Variable[]
  readonly allowanceTypes: AllowanceTypeOption[]
  readonly onSaved: (rule: Rule) => void
  readonly onCancel: () => void
}

function NewRuleForm({ ruleSetId, variables, allowanceTypes, onSaved, onCancel }: NewRuleFormProps) {
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')
  const [type, setType] = useState<'EARNING' | 'DEDUCTION' | 'EMPLOYER_COST'>('EARNING')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<{ value: number | null; error: string | null } | null>(null)
  const [selectedAllowanceId, setSelectedAllowanceId] = useState<string | undefined>(undefined)

  async function handleSave() {
    if (!name.trim() || !formula.trim()) {
      toast.error('Name and formula are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/formula/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleSetId, name, formula, type, applicableTo: 'ALL', isActive: true }),
      })
      const json = await res.json() as { ok: boolean; data?: Rule; message?: string }
      if (!json.ok || !json.data) {
        toast.error(json.message ?? 'Failed to create rule')
        return
      }
      onSaved(json.data)
      setName('')
      setFormula('')
      setType('EARNING')
      setSelectedAllowanceId(undefined)
      setPreview(null)
    } catch {
      toast.error('Failed to create rule')
    } finally {
      setSaving(false)
    }
  }

  async function testPreview() {
    const res = await fetch('/api/formula/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formula, context: DEFAULT_CONTEXT }),
    })
    const json = await res.json() as { ok: boolean; data?: { valid: boolean; result: number | null; error: string | null } }
    if (json.ok && json.data) setPreview({ value: json.data.result, error: json.data.error })
  }

  return (
    <Card className="border-2 border-blue-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">New Rule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowanceTypes.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Allowance Type (optional)</Label>
            <Select value={selectedAllowanceId} onValueChange={(v) => {
              const value = v as string
              setSelectedAllowanceId(value)
              const found = allowanceTypes.find((t) => t.id === value)
              if (found) {
                setName(found.name)
                setType('EARNING')
                setFormula(toCamelCase(found.name))
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Pick an allowance type to pre-fill…" /></SelectTrigger>
              <SelectContent>
                {allowanceTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Selecting one pre-fills the name, type, and formula variable. You can edit the formula freely.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Rule Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="GOSI Employee Contribution" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type *</Label>
            <Select value={type} onValueChange={(v) => { if (v) setType(v as typeof type) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EARNING">Earning</SelectItem>
                <SelectItem value="DEDUCTION">Deduction</SelectItem>
                <SelectItem value="EMPLOYER_COST">Employer Cost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Formula *</Label>
          <Input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="basicSalary * 0.10"
            className="font-mono"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {variables.slice(0, 8).map((v) => (
              <button
                type="button"
                key={v.id}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono transition-colors"
                onClick={() => setFormula((f) => f + v.key)}
              >
                {v.key}
              </button>
            ))}
          </div>
        </div>

        {preview && (
          <div className={`rounded-lg p-3 text-sm ${preview.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {preview.error ? `Error: ${preview.error}` : `Result: ${preview.value?.toLocaleString()}`}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={testPreview}>
            <Play className="w-3 h-3 mr-1.5" />
            Test
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Add Rule'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

