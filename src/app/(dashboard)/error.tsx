'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
interface DashboardErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[DashboardError]', error)
    }
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="border-0 shadow-sm max-w-md w-full">
        <CardContent className="text-center pt-8 pb-6 px-8">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Page Error</h2>
          <p className="text-gray-500 text-sm mb-1">
            {error.message || 'An unexpected error occurred on this page.'}
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-gray-300 mb-6">Ref: {error.digest}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button size="sm" onClick={reset} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={() => { globalThis.location.href = '/dashboard' }} className="gap-2">
              <Home className="w-3.5 h-3.5" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
