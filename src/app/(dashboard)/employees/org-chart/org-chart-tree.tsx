'use client'

import { useState } from 'react'
import { Tree, TreeNode } from 'react-organizational-chart'
import { User, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import type { OrgNode } from './page'

interface Props {
  readonly roots: OrgNode[]
  readonly allEmployees: {
    readonly id: string
    readonly fullName: string
    readonly jobTitle: string | null
    readonly orgUnit: { name: string } | null
    readonly employeeNumber: string
    readonly managerId: string | null
  }[]
}

function RecursiveNode({ node }: Readonly<{ node: OrgNode }>) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TreeNode
      label={
        <div className="flex flex-col items-center">
          <a
            href={`/employees/${node.id}/personal`}
            className="relative bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 w-44 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all select-none"
          >
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-gray-900 leading-tight truncate">
                  {node.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {node.jobTitle ?? node.orgUnit?.name ?? 'No title'}
                </p>
                <span className="inline-block mt-1 text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  #{node.employeeNumber}
                </span>
              </div>
            </div>
            {node.children.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v) }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 z-10 text-gray-500"
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed
                  ? <ChevronRight className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </a>
          {node.children.length > 0 && <div className="h-3" />}
        </div>
      }
    >
      {!collapsed && node.children.map((child) => (
        <RecursiveNode key={child.id} node={child} />
      ))}
    </TreeNode>
  )
}

export function OrgChartTree({ roots, allEmployees }: Props) {
  const unassigned = allEmployees.filter(
    (e) => !e.managerId && roots.every((r) => r.id !== e.id)
  )

  if (roots.length === 0 && allEmployees.length > 0) {
    // All employees exist but none have managers set — show flat list
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="font-medium text-amber-700">No manager relationships set up yet.</p>
        <p className="text-sm text-amber-600 mt-1">
          Assign managers to employees using the Edit Employee page to build the chart.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Main tree — scrollable horizontally on small screens */}
      <div className="overflow-x-auto pb-8 pt-4">
        {roots.length === 1 ? (
          <Tree
            lineWidth="2px"
            lineColor="#cbd5e1"
            lineBorderRadius="8px"
            label={
              <div className="flex flex-col items-center">
                <a
                  href={`/employees/${roots[0]!.id}/personal`}
                  className="bg-blue-600 text-white border-0 rounded-xl shadow-md px-4 py-3 w-48 cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs leading-tight truncate">{roots[0]!.fullName}</p>
                      <p className="text-xs text-blue-200 truncate mt-0.5">{roots[0]!.jobTitle ?? roots[0]!.orgUnit?.name ?? 'No title'}</p>
                      <span className="inline-block mt-1 text-xs font-mono bg-blue-500 px-1.5 py-0.5 rounded">
                        #{roots[0]!.employeeNumber}
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            }
          >
            {roots[0]!.children.map((child) => (
              <RecursiveNode key={child.id} node={child} />
            ))}
          </Tree>
        ) : (
          /* Multiple roots — render each as its own tree */
          <div className="flex flex-wrap gap-12 justify-center">
            {roots.map((root) => (
              <Tree
                key={root.id}
                lineWidth="2px"
                lineColor="#cbd5e1"
                lineBorderRadius="8px"
                label={
                  <a
                    href={`/employees/${root.id}/personal`}
                    className="bg-white border-2 border-blue-300 rounded-xl shadow-sm px-4 py-3 w-44 cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-gray-900 leading-tight truncate">{root.fullName}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{root.jobTitle ?? root.orgUnit?.name ?? 'No title'}</p>
                        <span className="inline-block mt-1 text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          #{root.employeeNumber}
                        </span>
                      </div>
                    </div>
                  </a>
                }
              >
                {root.children.map((child) => (
                  <RecursiveNode key={child.id} node={child} />
                ))}
              </Tree>
            ))}
          </div>
        )}
      </div>

      {/* Unassigned employees */}
      {unassigned.length > 0 && (
        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Unassigned ({unassigned.length}) — no manager set
          </p>
          <div className="flex flex-wrap gap-3">
            {unassigned.map((emp) => (
              <a
                key={emp.id}
                href={`/employees/${emp.id}/personal`}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm hover:border-blue-300 hover:shadow transition-all flex items-center gap-2 w-44"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{emp.fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{emp.jobTitle ?? '—'}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
