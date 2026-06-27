'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

// ─── Types (re-exported so the page file can use them) ────────────────────────

export type TransactionType = 'DEDUCTION' | 'OTHER_INCOME' | 'OVERTIME'

export interface LookupItem { id: string; name: string }

export interface OvertimeLookupItem {
  id:               string
  name:             string
  fixedRateEnabled: boolean
  fixedRateAmount:  number | null
}

export interface EmployeeInfo {
  id:             string
  employeeNumber: string
  fullName:       string
  jobTitle:       string | null
  orgUnit:        { name: string } | null
}

export interface SalaryTransaction {
  id:              string
  transactionType: TransactionType
  typeId:          string
  typeName:        string
  amount:          number
  hours:           number | null
  transactionDate: string | null
  description:     string | null
}

export interface NewRow {
  typeId:          string
  typeName:        string
  amount:          string
  hours:           string
  transactionDate: string
  description:     string
}

export const EMPTY_NEW_ROW: NewRow = {
  typeId: '', typeName: '', amount: '', hours: '', transactionDate: '', description: '',
}

// ─── Module-level helper ──────────────────────────────────────────────────────

async function fetchLookupTypes(): Promise<{
  deductionTypes: LookupItem[]
  otherIncomeTypes: LookupItem[]
  overtimeTypes: OvertimeLookupItem[]
}> {
  const [r1, r2, r3] = await Promise.all([
    fetch('/api/deduction-types?activeOnly=true'),
    fetch('/api/other-income-types?activeOnly=true'),
    fetch('/api/overtime-types?activeOnly=true'),
  ])
  return {
    deductionTypes:   r1.ok ? ((await r1.json() as { data: LookupItem[] }).data          ?? []) : [],
    otherIncomeTypes: r2.ok ? ((await r2.json() as { data: LookupItem[] }).data          ?? []) : [],
    overtimeTypes:    r3.ok ? ((await r3.json() as { data: OvertimeLookupItem[] }).data  ?? []) : [],
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSalaryTransactions() {
  const now = new Date()
  const [periodYear,  setPeriodYear]  = useState(now.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1)

  const [empCode,    setEmpCode]    = useState('')
  const [empInfo,    setEmpInfo]    = useState<EmployeeInfo | null>(null)
  const [empLoading, setEmpLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<TransactionType>('DEDUCTION')

  const [deductions,   setDeductions]   = useState<SalaryTransaction[]>([])
  const [otherIncomes, setOtherIncomes] = useState<SalaryTransaction[]>([])
  const [overtimes,    setOvertimes]    = useState<SalaryTransaction[]>([])

  const [deductionTypes,   setDeductionTypes]   = useState<LookupItem[]>([])
  const [otherIncomeTypes, setOtherIncomeTypes] = useState<LookupItem[]>([])
  const [overtimeTypes,    setOvertimeTypes]    = useState<OvertimeLookupItem[]>([])
  const [selectedOtRate,   setSelectedOtRate]   = useState<number | null>(null)

  const [addingRow, setAddingRow] = useState(false)
  const [newRow,    setNewRow]    = useState<NewRow>(EMPTY_NEW_ROW)
  const [savingNew, setSavingNew] = useState(false)

  const [editId,     setEditId]     = useState<string | null>(null)
  const [editRow,    setEditRow]    = useState<NewRow>(EMPTY_NEW_ROW)
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const empInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetchLookupTypes().then(({ deductionTypes, otherIncomeTypes, overtimeTypes }) => {
      setDeductionTypes(deductionTypes)
      setOtherIncomeTypes(otherIncomeTypes)
      setOvertimeTypes(overtimeTypes)
    })
  }, [])

  const loadTransactions = useCallback(async (empId: string) => {
    const base = `/api/salary-transactions?employeeId=${empId}&periodYear=${periodYear}&periodMonth=${periodMonth}`
    const [r1, r2, r3] = await Promise.all([
      fetch(`${base}&transactionType=DEDUCTION`),
      fetch(`${base}&transactionType=OTHER_INCOME`),
      fetch(`${base}&transactionType=OVERTIME`),
    ])
    if (r1.ok) { const j = await r1.json() as { data: SalaryTransaction[] }; setDeductions(j.data ?? []) }
    if (r2.ok) { const j = await r2.json() as { data: SalaryTransaction[] }; setOtherIncomes(j.data ?? []) }
    if (r3.ok) { const j = await r3.json() as { data: SalaryTransaction[] }; setOvertimes(j.data ?? []) }
  }, [periodYear, periodMonth])

  useEffect(() => {
    if (empInfo) { loadTransactions(empInfo.id) }
  }, [empInfo, loadTransactions])

  async function findEmployee() {
    const code = empCode.trim()
    if (!code) { toast.error('Enter an employee code'); return }
    setEmpLoading(true)
    try {
      const res = await fetch(`/api/employees/by-code?code=${encodeURIComponent(code)}`)
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        toast.error(j.error ?? 'Employee not found')
        setEmpInfo(null)
        return
      }
      const j = await res.json() as { data: EmployeeInfo }
      setEmpInfo(j.data)
      setAddingRow(false)
      setNewRow(EMPTY_NEW_ROW)
    } finally {
      setEmpLoading(false)
    }
  }

  const isOvertime = activeTab === 'OVERTIME'

  let currentRows: typeof deductions
  if (activeTab === 'DEDUCTION') currentRows = deductions
  else if (activeTab === 'OTHER_INCOME') currentRows = otherIncomes
  else currentRows = overtimes

  let currentTypes: typeof deductionTypes
  if (activeTab === 'DEDUCTION') currentTypes = deductionTypes
  else if (activeTab === 'OTHER_INCOME') currentTypes = otherIncomeTypes
  else currentTypes = overtimeTypes

  function startNewRow() {
    setEditId(null)
    setAddingRow(true)
    setNewRow(EMPTY_NEW_ROW)
    setSelectedOtRate(null)
  }

  async function saveNewRow() {
    if (!empInfo) return
    if (!newRow.typeId) { toast.error('Select a type'); return }
    const amt = Number.parseFloat(newRow.amount)
    if (Number.isNaN(amt) || amt < 0) { toast.error('Enter a valid amount'); return }

    setSavingNew(true)
    try {
      const body: Record<string, unknown> = {
        employeeId:      empInfo.id,
        transactionType: activeTab,
        typeId:          newRow.typeId,
        typeName:        newRow.typeName,
        amount:          amt,
        periodYear,
        periodMonth,
        transactionDate: newRow.transactionDate || null,
        description:     newRow.description.trim() || null,
      }
      if (isOvertime && newRow.hours !== '') {
        body.hours = Number.parseFloat(newRow.hours)
      }
      const res = await fetch('/api/salary-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(j.error ?? 'Failed to save'); return }
      toast.success('Transaction added')
      setAddingRow(false)
      setNewRow(EMPTY_NEW_ROW)
      await loadTransactions(empInfo.id)
    } finally {
      setSavingNew(false)
    }
  }

  function startEdit(row: SalaryTransaction) {
    setAddingRow(false)
    setEditId(row.id)
    setEditRow({
      typeId:          row.typeId,
      typeName:        row.typeName,
      amount:          String(row.amount),
      hours:           row.hours == null ? '' : String(row.hours),
      transactionDate: row.transactionDate
        ? (new Date(row.transactionDate).toISOString().split('T')[0] ?? '')
        : '',
      description:     row.description ?? '',
    })
  }

  async function saveEdit() {
    if (!empInfo || !editId) return
    const amt = Number.parseFloat(editRow.amount)
    if (Number.isNaN(amt) || amt < 0) { toast.error('Enter a valid amount'); return }

    setSavingEdit(true)
    try {
      const body: Record<string, unknown> = {
        typeId:          editRow.typeId,
        typeName:        editRow.typeName,
        amount:          amt,
        transactionDate: editRow.transactionDate || null,
        description:     editRow.description.trim() || null,
      }
      if (isOvertime) {
        body.hours = editRow.hours === '' ? null : Number.parseFloat(editRow.hours)
      }
      const res = await fetch(`/api/salary-transactions/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(j.error ?? 'Failed to update'); return }
      toast.success('Transaction updated')
      setEditId(null)
      await loadTransactions(empInfo.id)
    } finally {
      setSavingEdit(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId || !empInfo) return
    const res = await fetch(`/api/salary-transactions/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Transaction deleted')
      await loadTransactions(empInfo.id)
    } else {
      const j = await res.json() as { error?: string }
      toast.error(j.error ?? 'Failed to delete')
    }
    setDeleteId(null)
  }

  function changeTab(tab: TransactionType) {
    setActiveTab(tab)
    setAddingRow(false)
    setEditId(null)
    setNewRow(EMPTY_NEW_ROW)
    setSelectedOtRate(null)
  }

  function handleTypeSelect(typeId: string, forNew: boolean) {
    const found    = currentTypes.find((t) => t.id === typeId)
    const typeName = found?.name ?? ''
    const setter   = forNew ? setNewRow : setEditRow

    if (activeTab !== 'OVERTIME') {
      setter((r) => ({ ...r, typeId, typeName }))
      return
    }

    const ot   = overtimeTypes.find((t) => t.id === typeId)
    const rate = (ot?.fixedRateAmount && ot.fixedRateAmount > 0) ? ot.fixedRateAmount : null
    setSelectedOtRate(rate)

    const currentHours = forNew ? newRow.hours : editRow.hours
    const currentAmt   = forNew ? newRow.amount : editRow.amount
    const hrs          = Number.parseFloat(currentHours)
    const amount       = rate && !Number.isNaN(hrs) && hrs > 0
      ? String((hrs * rate).toFixed(2))
      : currentAmt

    setter((r) => ({ ...r, typeId, typeName, amount }))
  }

  return {
    // Period
    periodYear, setPeriodYear, periodMonth, setPeriodMonth,
    // Employee lookup
    empCode, setEmpCode, empInfo, empLoading, empInputRef, findEmployee,
    // Tabs
    activeTab, currentRows, currentTypes, isOvertime, changeTab,
    // Lookup types (for type select dropdowns)
    overtimeTypes,
    // Selected OT rate
    selectedOtRate, setSelectedOtRate,
    // Adding row
    addingRow, setAddingRow, newRow, setNewRow, savingNew, startNewRow, saveNewRow,
    // Editing row
    editId, setEditId, editRow, setEditRow, savingEdit, startEdit, saveEdit,
    // Delete
    deleteId, setDeleteId, confirmDelete,
    // Type selection
    handleTypeSelect,
  }
}
