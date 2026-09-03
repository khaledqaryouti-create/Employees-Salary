'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CostDist {
  id: string
  periodStart: string
  periodEnd: string
  allocatedCost: string
  employee: { id: string; fullName: string }
}

interface BudgetLine {
  id: string
  category: string
  plannedAmount: string
  periodStart: string
}

interface Props {
  distributions: CostDist[]
  budgetLines: BudgetLine[]
  currency: string
  t: ReturnType<typeof useTranslations<'projects'>>
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ProjectCharts({ distributions, budgetLines, currency, t }: Props) {
  // Cost trend by period (grouped by periodStart)
  const costTrend = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of distributions) {
      const key  = d.periodStart.slice(0, 7) // YYYY-MM
      const prev = map.get(key) ?? 0
      map.set(key, prev + Number(d.allocatedCost))
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, cost]) => ({ period, cost: Math.round(cost * 100) / 100 }))
  }, [distributions])

  // Employee distribution (pie)
  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>()
    for (const d of distributions) {
      const prev = map.get(d.employee.id) ?? { name: d.employee.fullName, value: 0 }
      map.set(d.employee.id, { ...prev, value: prev.value + Number(d.allocatedCost) })
    }
    return [...map.values()].map(e => ({ ...e, value: Math.round(e.value * 100) / 100 }))
  }, [distributions])

  // Budget vs Actual by category
  const budgetVsActual = useMemo(() => {
    const planned: Record<string, number> = {}
    for (const bl of budgetLines) {
      planned[bl.category] = (planned[bl.category] ?? 0) + Number(bl.plannedAmount)
    }
    const actual = { LABOR: 0 }
    for (const d of distributions) {
      actual.LABOR += Number(d.allocatedCost)
    }
    const categories = [...new Set([...Object.keys(planned), ...Object.keys(actual)])]
    return categories.map(cat => ({
      category: cat,
      planned:  Math.round((planned[cat] ?? 0) * 100) / 100,
      actual:   Math.round(((actual as Record<string, number>)[cat] ?? 0) * 100) / 100,
    }))
  }, [distributions, budgetLines])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Cost trend */}
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">{t('costTrend')}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={costTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} ${currency}`, t('allocatedCost')]} />
              <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget vs Actual */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('budgetVsActual')}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={budgetVsActual}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" fill="#93c5fd" name={t('planned')} />
              <Bar dataKey="actual"  fill="#3b82f6" name={t('actual')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Employee cost distribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('employeeCostDistribution')}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byEmployee} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {byEmployee.map((emp, i) => (
                  <Cell key={emp.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${Number(v).toLocaleString()} ${currency}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
