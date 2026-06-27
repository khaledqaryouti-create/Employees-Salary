import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { OrgChartTree } from './org-chart-tree'
import { GitBranch } from 'lucide-react'

export interface OrgNode {
  id: string
  fullName: string
  jobTitle: string | null
  orgUnit: { name: string } | null
  employeeNumber: string
  managerId: string | null
  children: OrgNode[]
}

function buildTree(employees: Omit<OrgNode, 'children'>[]): OrgNode[] {
  const map = new Map<string, OrgNode>()
  for (const e of employees) {
    map.set(e.id, { ...e, children: [] })
  }

  const roots: OrgNode[] = []
  for (const node of map.values()) {
    if (!node.managerId || !map.has(node.managerId)) {
      roots.push(node)
    } else {
      map.get(node.managerId)!.children.push(node)
    }
  }
  return roots
}

export default async function OrgChartPage() {
  const { orgId } = await getProfileOrRedirect()

  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId, isActive: true },
    select: {
      id: true,
      fullName: true,
      jobTitle: true,
      orgUnit: { select: { name: true } },
      employeeNumber: true,
      managerId: true,
    },
    orderBy: { fullName: 'asc' },
  })

  const tree = buildTree(employees)
  const totalCount = employees.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-600" />
            Organization Chart
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} active employees · click any card to view details
          </p>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <GitBranch className="w-14 h-14 text-gray-200 mb-4" />
          <p className="font-medium">No active employees yet.</p>
        </div>
      ) : (
        <OrgChartTree roots={tree} allEmployees={employees} />
      )}
    </div>
  )
}
