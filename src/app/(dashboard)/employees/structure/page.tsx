import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import StructureTree from './structure-tree'

type RawUnit = {
  id: string
  name: string
  code: string | null
  parentId: string | null
  isActive: boolean
  level: { id: string; name: string; depth: number; color: string | null }
  _count: { employees: number }
}

export type TreeNode = RawUnit & { children: TreeNode[] }

function buildTree(units: RawUnit[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  units.forEach(u => map.set(u.id, { ...u, children: [] }))
  const roots: TreeNode[] = []
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export default async function StructurePage() {
  const { orgId } = await getProfileOrRedirect()

  const [levels, units] = await Promise.all([
    prisma.orgUnitLevel.findMany({
      where: { organizationId: orgId },
      orderBy: { depth: 'asc' },
    }),
    prisma.orgUnit.findMany({
      where: { organizationId: orgId },
      orderBy: [{ level: { depth: 'asc' } }, { order: 'asc' }, { name: 'asc' }],
      include: {
        level: true,
        _count: { select: { employees: true } },
      },
    }),
  ])

  const tree = buildTree(units)

  const totalEmployees = units.reduce((s, u) => s + u._count.employees, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Structure</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visual hierarchy of your organisation&apos;s units.{' '}
            <a href="/settings/org-units" className="underline text-primary">
              Manage units
            </a>{' '}
            in Settings.
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="font-semibold text-foreground text-base">{units.length}</p>
          <p>total units</p>
          <p className="font-semibold text-foreground text-base mt-1">{totalEmployees}</p>
          <p>assigned employees</p>
        </div>
      </div>

      {levels.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          <p className="font-medium text-base">No structure configured yet</p>
          <p className="text-sm mt-1">
            Start by defining levels in{' '}
            <a href="/settings/org-levels" className="underline text-primary">
              Settings &rsaquo; Org Levels
            </a>
            , then add units in{' '}
            <a href="/settings/org-units" className="underline text-primary">
              Settings &rsaquo; Org Units
            </a>.
          </p>
        </div>
      ) : (
        <StructureTree tree={tree} levels={levels} />
      )}
    </div>
  )
}
