'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Users, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { TreeNode } from './page'

type Level = { id: string; name: string; depth: number; color: string | null }

function NodeCard({
  node,
  depth = 0,
}: Readonly<{
  node: TreeNode
  depth?: number
}>) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const indent = depth * 24

  let expandIcon: React.ReactNode
  if (!hasChildren) {
    expandIcon = <span className="inline-block w-4 h-4" />
  } else if (expanded) {
    expandIcon = <ChevronDown className="h-4 w-4" />
  } else {
    expandIcon = <ChevronRight className="h-4 w-4" />
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
        style={{ marginLeft: indent }}
      >
        <button
          className="shrink-0 text-muted-foreground"
          onClick={() => setExpanded(e => !e)}
          disabled={!hasChildren}
        >
          {expandIcon}
        </button>

        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: node.level.color ?? '#6b7280' }}
        />

        <span className="font-medium flex-1 truncate">{node.name}</span>

        {node.code && (
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
            {node.code}
          </span>
        )}

        <Badge
          variant="secondary"
          className="text-white text-xs shrink-0"
          style={{ backgroundColor: node.level.color ?? '#6b7280' }}
        >
          {node.level.name}
        </Badge>

        {node._count.employees > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3 w-3" />
            {node._count.employees}
          </span>
        )}

        {!node.isActive && (
          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
            Inactive
          </Badge>
        )}

        <a
          href={`/employees/personal?unit=${node.id}`}
          className="text-xs text-primary underline opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:inline"
        >
          View employees
        </a>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <NodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function LevelLegend({ levels }: Readonly<{ levels: Level[] }>) {
  return (
    <div className="flex flex-wrap gap-3">
      {levels.map(l => (
        <span key={l.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: l.color ?? '#6b7280' }}
          />
          <span>
            {l.name} <span className="opacity-50">(depth {l.depth})</span>
          </span>
        </span>
      ))}
    </div>
  )
}

export default function StructureTree({
  tree,
  levels,
}: Readonly<{
  tree: TreeNode[]
  levels: Level[]
}>) {
  return (
    <div className="space-y-4">
      <LevelLegend levels={levels} />

      <div className="rounded-lg border bg-card p-4 space-y-1">
        {tree.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No units added yet.</p>
          </div>
        ) : (
          tree.map(node => <NodeCard key={node.id} node={node} depth={0} />)
        )}
      </div>
    </div>
  )
}
