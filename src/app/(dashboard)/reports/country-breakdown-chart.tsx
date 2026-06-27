'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'

interface CountryItem {
  country: string
  count: number
  netPay: number
}

interface Props {
  readonly data: CountryItem[]
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

function LegendLabel({ value }: { readonly value: string }) {
  return <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>
}

function renderLegendLabel(value: string) {
  return <LegendLabel value={value} />
}

export function CountryBreakdownChart({ data }: Props) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.country,
    value: d.count,
  }))

  return (
    <div className="h-56 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${Number(value)} employees`, name]}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '12px',
            }}
          />
          <Legend
            iconSize={8}
            iconType="circle"
            formatter={renderLegendLabel}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
