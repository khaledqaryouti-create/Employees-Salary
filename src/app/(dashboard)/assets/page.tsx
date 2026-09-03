'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Package, Search, Loader2, Plus } from 'lucide-react'

type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED'

interface Asset {
  id: string
  name: string
  serialNumber: string | null
  assetTag: string | null
  acquisitionCost: string
  residualValue: string
  usefulLifeMonths: number
  status: AssetStatus
  assetType: { id: string; name: string }
}

const STATUS_COLOR: Record<AssetStatus, string> = {
  AVAILABLE:   'bg-green-100 text-green-700',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  RETIRED:     'bg-gray-100 text-gray-500',
}

export default function AssetsPage() {
  const t = useTranslations('assets')
  const [assets, setAssets]   = useState<Asset[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]       = useState(1)
  const limit = 20

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search)       params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res  = await fetch(`/api/assets?${params.toString()}`)
      const json = await res.json() as { ok: boolean; data: { data: Asset[]; total: number } }
      if (json.ok) { setAssets(json.data.data); setTotal(json.data.total) }
    } catch {
      toast.error(t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, t])

  useEffect(() => { void fetchAssets() }, [fetchAssets])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
        <Button className="flex items-center gap-2" disabled>
          <Plus className="w-4 h-4" />
          {t('newAsset')}
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder={t('searchPlaceholder')} value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">{t('allStatuses')}</option>
          {(['AVAILABLE','ASSIGNED','MAINTENANCE','RETIRED'] as AssetStatus[]).map(s => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('noAssets')}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const monthlyDep = (Number(asset.acquisitionCost) - Number(asset.residualValue)) / asset.usefulLifeMonths
            return (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{asset.name}</p>
                      <p className="text-xs text-gray-500">{asset.assetType.name}</p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[asset.status]}`}>
                      {t(`status.${asset.status}`)}
                    </span>
                  </div>
                  {asset.serialNumber && <p className="text-xs text-gray-400 font-mono">S/N: {asset.serialNumber}</p>}
                  {asset.assetTag && <Badge variant="outline" className="text-xs">{asset.assetTag}</Badge>}
                  <div className="flex justify-between text-xs text-gray-500 pt-1">
                    <span>{t('cost')}: {Number(asset.acquisitionCost).toLocaleString()}</span>
                    <span>{t('monthly')}: {monthlyDep.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} {t('total')}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('prev')}</Button>
            <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>{t('next')}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
