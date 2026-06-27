'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Receipt, Search, Plus, Trash2, Pencil, Check, X, UserCheck,
} from 'lucide-react'
import { useSalaryTransactions, EMPTY_NEW_ROW } from './use-salary-transactions'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: 'January' },   { value: 2, label: 'February' },
  { value: 3, label: 'March' },     { value: 4, label: 'April' },
  { value: 5, label: 'May' },       { value: 6, label: 'June' },
  { value: 7, label: 'July' },      { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

const TABS = [
  { key: 'DEDUCTION'    as const, label: 'Deductions'    },
  { key: 'OTHER_INCOME' as const, label: 'Other Income'  },
  { key: 'OVERTIME'     as const, label: 'Overtime'      },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalaryTransactionsPage() {
  const {
    periodYear, setPeriodYear, periodMonth, setPeriodMonth,
    empCode, setEmpCode, empInfo, empLoading, empInputRef, findEmployee,
    activeTab, currentRows, currentTypes, isOvertime, changeTab,
    selectedOtRate, setSelectedOtRate,
    addingRow, setAddingRow, newRow, setNewRow, savingNew, startNewRow, saveNewRow,
    editId, setEditId, editRow, setEditRow, savingEdit, startEdit, saveEdit,
    deleteId, setDeleteId, confirmDelete,
    handleTypeSelect,
  } = useSalaryTransactions()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          Salary Transactions
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter deduction, other income, and overtime amounts per employee for a payroll period
        </p>
      </div>

      {/* Period + Employee controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Month */}
            <div className="space-y-1 min-w-[140px]">
              <Label>Month</Label>
              <Select
                value={String(periodMonth)}
                onValueChange={(v) => setPeriodMonth(Number.parseInt(v ?? '', 10))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-1 w-[100px]">
              <Label>Year</Label>
              <Input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number.parseInt(e.target.value, 10) || new Date().getFullYear())}
                min={2000}
                max={2100}
              />
            </div>

            {/* Employee code */}
            <div className="space-y-1 flex-1 min-w-[180px]">
              <Label>Employee Code</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={empInputRef}
                    placeholder="Enter employee code…"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void findEmployee() }}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => void findEmployee()} disabled={empLoading}>
                  {empLoading ? 'Finding…' : 'Find'}
                </Button>
              </div>
            </div>
          </div>

          {/* Employee info banner */}
          {empInfo && (
            <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">{empInfo.fullName}</p>
                <p className="text-xs text-blue-600">
                  {empInfo.employeeNumber}
                  {empInfo.orgUnit?.name ? ` · ${empInfo.orgUnit.name}` : ''}
                  {empInfo.jobTitle      ? ` · ${empInfo.jobTitle}`     : ''}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs + transaction table */}
      {empInfo ? (
        <Card className="border-0 shadow-sm">
          {/* Tab bar */}
          <div className="border-b border-gray-200 px-4">
            <div className="flex gap-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key)}
                  className={`
                    px-5 py-3 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <CardHeader className="py-3 px-4 flex-row items-center justify-between">
            <CardTitle className="text-sm text-gray-600">
              {MONTHS.find((m) => m.value === periodMonth)?.label} {periodYear}
              {' — '}
              {currentRows.length} record{currentRows.length === 1 ? '' : 's'}
            </CardTitle>
            <Button size="sm" onClick={startNewRow} className="gap-1">
              <Plus className="w-4 h-4" /> New
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    {isOvertime && (
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Hours</th>
                    )}
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 && !addingRow && (
                    <tr>
                      <td
                        colSpan={isOvertime ? 6 : 5}
                        className="text-center py-10 text-gray-400"
                      >
                        No records. Click <strong>New</strong> to add one.
                      </td>
                    </tr>
                  )}

                  {currentRows.map((row) =>
                    editId === row.id ? (
                      /* ── Inline edit row ── */
                      <tr key={row.id} className="border-t border-blue-100 bg-blue-50">
                        <td className="px-4 py-2">
                          <Select
                            value={editRow.typeId}
                            onValueChange={(v) => handleTypeSelect(v ?? '', false)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              {editRow.typeName
                                ? <span className="truncate">{editRow.typeName}</span>
                                : <span className="text-gray-400">Select type…</span>}
                            </SelectTrigger>
                            <SelectContent>
                              {currentTypes.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="date"
                            className="h-8 text-sm w-36"
                            value={editRow.transactionDate}
                            onChange={(e) => setEditRow((r) => ({ ...r, transactionDate: e.target.value }))}
                          />
                        </td>
                        {isOvertime && (
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              className="h-8 text-sm text-right w-24 ml-auto"
                              placeholder="0.00"
                              value={editRow.hours}
                              onChange={(e) => {
                                const hrs = Number.parseFloat(e.target.value)
                                setEditRow((r) => ({
                                  ...r,
                                  hours:  e.target.value,
                                  amount: selectedOtRate && !Number.isNaN(hrs) && hrs > 0
                                    ? String((hrs * selectedOtRate).toFixed(2))
                                    : r.amount,
                                }))
                              }}
                              min={0}
                            />
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <div className="relative">
                            <Input
                              type="number"
                              className={`h-8 text-sm text-right w-32 ml-auto ${selectedOtRate ? 'bg-amber-50 border-amber-300' : ''}`}
                              placeholder="0.00"
                              value={editRow.amount}
                              onChange={(e) => setEditRow((r) => ({ ...r, amount: e.target.value }))}
                              min={0}
                            />
                            {selectedOtRate && (
                              <span className="absolute -top-4 right-0 text-[10px] text-amber-600 font-medium">auto</span>
                            )}
                            {isOvertime && editRow.typeId && !selectedOtRate && (
                              <p className="text-[10px] text-gray-400 mt-0.5 text-right whitespace-nowrap">
                                Enter manually — no fixed rate set
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            className="h-8 text-sm"
                            placeholder="Optional notes…"
                            value={editRow.description}
                            onChange={(e) => setEditRow((r) => ({ ...r, description: e.target.value }))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => void saveEdit()}
                              disabled={savingEdit}
                              className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                              aria-label="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditId(null); setSelectedOtRate(null) }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                              aria-label="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      /* ── Display row ── */
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.typeName}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.transactionDate
                            ? new Date(row.transactionDate).toLocaleDateString('en-GB')
                            : '—'}
                        </td>
                        {isOvertime && (
                          <td className="px-4 py-3 text-right text-gray-700">
                            {row.hours == null ? '—' : row.hours.toLocaleString()}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{row.description ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                              aria-label="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}

                  {/* ── New row input ── */}
                  {addingRow && (
                    <tr className="border-t border-blue-100 bg-blue-50">
                      <td className="px-4 py-2">
                        <Select
                          value={newRow.typeId}
                          onValueChange={(v) => handleTypeSelect(v ?? '', true)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            {newRow.typeName
                              ? <span className="truncate">{newRow.typeName}</span>
                              : <span className="text-gray-400">Select type…</span>}
                          </SelectTrigger>
                          <SelectContent>
                            {currentTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="date"
                          className="h-8 text-sm w-36"
                          value={newRow.transactionDate}
                          onChange={(e) => setNewRow((r) => ({ ...r, transactionDate: e.target.value }))}
                        />
                      </td>
                      {isOvertime && (
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            className="h-8 text-sm text-right w-24 ml-auto"
                            placeholder="0.00"
                            value={newRow.hours}
                            onChange={(e) => {
                              const hrs = Number.parseFloat(e.target.value)
                              setNewRow((r) => ({
                                ...r,
                                hours:  e.target.value,
                                amount: selectedOtRate && !Number.isNaN(hrs) && hrs > 0
                                  ? String((hrs * selectedOtRate).toFixed(2))
                                  : r.amount,
                              }))
                            }}
                            min={0}
                          />
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <div className="relative">
                          <Input
                            type="number"
                            className={`h-8 text-sm text-right w-32 ml-auto ${selectedOtRate ? 'bg-amber-50 border-amber-300' : ''}`}
                            placeholder="0.00"
                            value={newRow.amount}
                            onChange={(e) => setNewRow((r) => ({ ...r, amount: e.target.value }))}
                            min={0}
                          />
                          {selectedOtRate && (
                            <span className="absolute -top-4 right-0 text-[10px] text-amber-600 font-medium">auto</span>
                          )}
                          {isOvertime && newRow.typeId && !selectedOtRate && (
                            <p className="text-[10px] text-gray-400 mt-0.5 text-right whitespace-nowrap">
                              Enter manually — no fixed rate set
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 text-sm"
                          placeholder="Optional notes…"
                          value={newRow.description}
                          onChange={(e) => setNewRow((r) => ({ ...r, description: e.target.value }))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => void saveNewRow()}
                            disabled={savingNew}
                            className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                            aria-label="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAddingRow(false); setNewRow(EMPTY_NEW_ROW); setSelectedOtRate(null) }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                            aria-label="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <UserCheck className="w-10 h-10" />
            <p className="text-sm">Enter an employee code above and click <strong>Find</strong> to begin</p>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This transaction will be permanently deleted. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
