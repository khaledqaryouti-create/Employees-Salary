'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Prisma } from '@prisma/client'

type Rule = Prisma.PayrollRuleGetPayload<Record<string, never>>

type PreviewResult = { value: number | null; error: string | null }
type PreviewMap = Record<string, PreviewResult>

interface UseRuleEditorOptions {
  readonly initialRules: Rule[]
  readonly testContext: Record<string, number>
}

interface UseRuleEditorReturn {
  rules: Rule[]
  editingId: string | null
  saving: string | null
  previewResults: PreviewMap
  previewLoading: boolean
  setEditingId: (id: string | null) => void
  saveRule: (ruleId: string, data: Partial<Rule>) => Promise<void>
  testFormula: (formula: string, ruleId: string) => Promise<void>
  runAllPreviews: () => Promise<void>
  addRule: (newRule: Rule) => void
}

export function useRuleEditor({ initialRules, testContext }: UseRuleEditorOptions): UseRuleEditorReturn {
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [previewResults, setPreviewResults] = useState<PreviewMap>({})
  const [previewLoading, setPreviewLoading] = useState(false)

  async function saveRule(ruleId: string, data: Partial<Rule>) {
    setSaving(ruleId)
    try {
      const res = await fetch(`/api/formula/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json() as { ok: boolean; data?: Rule; message?: string }
      if (!json.ok) {
        toast.error(json.message ?? 'Failed to save rule')
        return
      }
      setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, ...json.data } : r))
      setEditingId(null)
      toast.success('Rule saved successfully')
    } catch {
      toast.error('Failed to save rule. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  async function testFormula(formula: string, ruleId: string) {
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/formula/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula, context: testContext }),
      })
      const json = await res.json() as { ok: boolean; data?: { valid: boolean; result: number | null; error: string | null } }
      if (json.ok && json.data) {
        setPreviewResults((prev) => ({ ...prev, [ruleId]: { value: json.data!.result, error: json.data!.error } }))
      }
    } catch {
      toast.error('Preview failed. Please try again.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function runAllPreviews() {
    setPreviewLoading(true)
    const results: PreviewMap = {}

    await Promise.all(
      rules.map(async (rule) => {
        try {
          const res = await fetch('/api/formula/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formula: rule.formula, context: testContext }),
          })
          const json = await res.json() as { ok: boolean; data?: { valid: boolean; result: number | null; error: string | null } }
          if (json.ok && json.data) {
            results[rule.id] = { value: json.data.result, error: json.data.error }
          }
        } catch {
          results[rule.id] = { value: null, error: 'Preview failed' }
        }
      })
    )

    setPreviewResults(results)
    setPreviewLoading(false)
    toast.success(`Previewed ${rules.length} rules`)
  }

  function addRule(newRule: Rule) {
    setRules((prev) => [...prev, newRule])
  }

  return { rules, editingId, saving, previewResults, previewLoading, setEditingId, saveRule, testFormula, runAllPreviews, addRule }
}
