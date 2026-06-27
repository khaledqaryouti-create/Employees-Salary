'use client'

import { useState, useRef } from 'react'
import { loginAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Globe, Building2 } from 'lucide-react'

interface BranchOption {
  id: string
  name: string
  nameAr?: string | null
  code?: string | null
  isHeadQuarter: boolean
  city?: string | null
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchBranches(email: string) {
    const trimmed = email.trim()
    if (!trimmed) {
      setBranches([])
      setSelectedBranch('')
      return
    }

    setLoadingBranches(true)
    try {
      const res = await fetch(`/api/auth/branches-by-email?email=${encodeURIComponent(trimmed)}`)
      if (res.ok) {
        const data = await res.json() as BranchOption[]
        setBranches(data)
        if (data.length === 1) {
          setSelectedBranch(data[0]!.id)
        } else {
          setSelectedBranch('')
        }
      }
    } catch {
      // Silent fail — branch dropdown simply won't appear
    } finally {
      setLoadingBranches(false)
    }
  }

  function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void fetchBranches(e.currentTarget.value)
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.currentTarget.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void fetchBranches(value) }, 600)
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const result = await loginAction(formData)
      if (result?.error) {
        toast.error(result.error)
      }
      // On success, loginAction calls redirect() server-side — no client code needed
    } catch {
      // redirect() throws — this is expected on success, ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center p-12 text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">PayrollPro</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Multi-Region Payroll, Simplified
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Manage payroll across GCC, Asia, North Africa, and Italy — with AI-powered insights,
            full compliance automation, and zero hardcoded rules.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Countries Covered', value: '13+' },
              { label: 'Compliance Rules', value: '100%' },
              { label: 'Languages', value: '3' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-blue-200 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Globe className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">PayrollPro</span>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Sign in to your account</CardTitle>
              <CardDescription>
                Enter your credentials to access the payroll dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    disabled={loading}
                    autoComplete="email"
                    required
                    onBlur={handleEmailBlur}
                    onChange={handleEmailChange}
                  />
                  {!loadingBranches && branches.length === 0 && (
                    <p className="text-xs text-gray-400">Your branch list will appear after you enter your email.</p>
                  )}
                </div>

                {/* Branch selector — shown only when branches are available */}
                {loadingBranches && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading branches…</span>
                  </div>
                )}

                {!loadingBranches && branches.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="branchId">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        Branch
                      </span>
                    </Label>
                    <select
                      id="branchId"
                      name="branchId"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      required
                      disabled={loading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>Select your branch…</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                          {branch.isHeadQuarter ? ' (HQ)' : ''}
                          {branch.city ? ` — ${branch.city}` : ''}
                          {branch.code ? ` [${branch.code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading || (branches.length > 0 && !selectedBranch)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <a href="/auth/signup" className="text-blue-600 hover:underline font-medium">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
