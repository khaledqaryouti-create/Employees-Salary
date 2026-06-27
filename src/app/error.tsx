'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface RootErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.error('[RootError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-6">
          An unexpected error occurred.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-gray-400">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => { globalThis.location.href = '/dashboard' }}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
