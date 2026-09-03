'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { loginAction } from './actions'
import { setLocale } from '@/app/actions/set-locale'
import { locales, localeLabels } from '@/i18n/locales'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Globe, Globe2, Building2, Briefcase } from 'lucide-react'

interface OrgOption {
  id: string
  name: string
  displayName?: string | null
}

interface BranchOption {
  id: string
  name: string
  nameAr?: string | null
  code?: string | null
  isHeadQuarter: boolean
  city?: string | null
}

export default function LoginPage() {
  const [loading, setLoading]                 = useState(false)
  const [orgs, setOrgs]                       = useState<OrgOption[]>([])
  const [loadingOrgs, setLoadingOrgs]         = useState(true)
  const [orgLoadError, setOrgLoadError]       = useState(false)
  const [selectedOrg, setSelectedOrg]         = useState('')
  const [branches, setBranches]               = useState<BranchOption[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [selectedBranch, setSelectedBranch]   = useState('')

  const t      = useTranslations('login')
  const locale = useLocale()
  const router = useRouter()

  async function handleLocaleChange(newLocale: string) {
    await setLocale(newLocale)
    router.refresh()
  }

  // true once any fetch attempt has completed — used for hint text rendering
  const [hasFetched, setHasFetched] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the latest email value so effects triggered by org-change use it
  const emailValueRef    = useRef('')
  // Always points to the latest fetchBranches — fixes stale closure in debounce
  const fetchBranchesRef = useRef<(email: string) => Promise<void>>(() => Promise.resolve())
  // Ref mirror of hasFetched — safe to read synchronously in event handlers
  const hasFetchedRef    = useRef(false)
  // Mirrors `branches` state so submit handler can read synchronously
  const branchesRef      = useRef<BranchOption[]>([])

  // Keep refs in sync with state
  useEffect(() => { branchesRef.current = branches }, [branches])
  useEffect(() => { hasFetchedRef.current = hasFetched }, [hasFetched])

  // ── Load company list ────────────────────────────────────────────────────
  const loadOrgs = useCallback(async () => {
    setLoadingOrgs(true)
    setOrgLoadError(false)
    try {
      const res = await fetch('/api/auth/organizations')
      if (res.ok) {
        const data = await res.json() as OrgOption[]
        setOrgs(data)
        if (data.length === 1) setSelectedOrg(data[0]!.id)
      } else {
        setOrgLoadError(true)
      }
    } catch {
      setOrgLoadError(true)
    } finally {
      setLoadingOrgs(false)
    }
  }, [])

  useEffect(() => { void loadOrgs() }, [loadOrgs])

  // When the user changes company, reset branch selection and fetch state
  function handleOrgChange(orgId: string) {
    setSelectedOrg(orgId)
    setBranches([])
    setSelectedBranch('')
    setHasFetched(false)
  }

  // useCallback so fetchBranchesRef always captures the latest selectedOrg
  const fetchBranches = useCallback(async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) {
      setBranches([])
      setSelectedBranch('')
      return
    }

    setLoadingBranches(true)
    try {
      const params = new URLSearchParams({ email: trimmed })
      if (selectedOrg) params.set('organizationId', selectedOrg)
      const res = await fetch(`/api/auth/branches-by-email?${params.toString()}`)
      if (res.ok) {
        const data = await res.json() as BranchOption[]
        setBranches(data)
        branchesRef.current = data
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
      setHasFetched(true)   // mark that at least one fetch attempt completed
    }
  }, [selectedOrg])

  // Keep fetchBranchesRef pointing to the latest version
  useEffect(() => {
    fetchBranchesRef.current = fetchBranches
  }, [fetchBranches])

  // Re-fetch whenever the selected org changes AND email is already filled.
  // Also reads from the DOM element to catch browser-autofilled values that
  // never triggered React's onChange/onBlur events.
  useEffect(() => {
    if (!selectedOrg) return
    const emailEl  = document.getElementById('email') as HTMLInputElement | null
    const emailVal = emailValueRef.current || emailEl?.value?.trim() || ''
    if (emailVal) {
      emailValueRef.current = emailVal
      void fetchBranchesRef.current(emailVal)
    }
  }, [selectedOrg])

  function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    emailValueRef.current = e.currentTarget.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void fetchBranchesRef.current(e.currentTarget.value)
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.currentTarget.value
    emailValueRef.current = value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Always call through the ref so the latest fetchBranches (with current selectedOrg) runs
    debounceRef.current = setTimeout(() => { void fetchBranchesRef.current(value) }, 600)
  }

  // Triggered when the user focuses the password field — the most reliable
  // signal that browser autofill has finished filling the email field.
  function handlePasswordFocus() {
    const emailEl = document.getElementById('email') as HTMLInputElement | null
    const email   = emailEl?.value?.trim() ?? ''
    if (email && selectedOrg && !hasFetchedRef.current) {
      emailValueRef.current = email
      void fetchBranchesRef.current(email)
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email    = (formData.get('email') as string)?.trim()

    // Autofill guard: email was filled by the browser without triggering events —
    // fetch branches now and let the user pick before submitting.
    if (email && selectedOrg && !hasFetchedRef.current) {
      emailValueRef.current = email
      await fetchBranchesRef.current(email)
      if (branchesRef.current.length > 0) return  // show branch picker first
    }

    setLoading(true)
    try {
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

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

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
      <div className="relative flex-1 flex items-center justify-center p-6 bg-gray-50">
          {/* Language selector — top-right of right panel */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-gray-400" />
            <select
              value={locale}
              onChange={(e) => { void handleLocaleChange(e.target.value) }}
              className="text-sm text-gray-600 bg-transparent border-none outline-none cursor-pointer"
              aria-label="Select language"
            >
              {locales.map((l) => (
                <option key={l} value={l}>{localeLabels[l]}</option>
              ))}
            </select>
          </div>
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Globe className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">PayrollPro</span>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">{t('title')}</CardTitle>
              <CardDescription>
                {t('subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">

                {/* Company selector — shown immediately, populated on mount */}
                <div className="space-y-2">
                  <Label htmlFor="orgId">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      {t('company')}
                    </span>
                  </Label>
                  {loadingOrgs ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 h-10">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('loadingCompanies')}</span>
                    </div>
                  ) : orgLoadError ? (
                    <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2">
                      <span className="text-sm text-red-600">{t('orgLoadError')}</span>
                      <button
                        type="button"
                        onClick={() => { void loadOrgs() }}
                        className="ml-3 text-sm font-medium text-red-700 underline hover:no-underline"
                      >
                        {t('retry')}
                      </button>
                    </div>
                  ) : (
                    <select
                      id="orgId"
                      value={selectedOrg}
                      onChange={(e) => handleOrgChange(e.target.value)}
                      required
                      disabled={loading || orgs.length === 0}
                      className={selectClass}
                    >
                      <option value="" disabled>
                        {orgs.length === 0 ? t('noCompanies') : t('selectCompany')}
                      </option>
                      {orgs.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.displayName ?? org.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {/* Pass selected org to server action */}
                  <input type="hidden" name="organizationId" value={selectedOrg} />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    disabled={loading}
                    autoComplete="email"
                    required
                    onBlur={handleEmailBlur}
                    onChange={handleEmailChange}
                  />
                  {!loadingBranches && branches.length === 0 && (
                    <p className="text-xs text-gray-400">
                      {hasFetched
                        ? t('branchHintNotFound')
                        : t('branchHintNotFetched')}
                    </p>
                  )}
                </div>

                {/* Branch selector — shown only when branches are available */}
                {loadingBranches && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('loadingBranches')}</span>
                  </div>
                )}

                {!loadingBranches && branches.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="branchId">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        {t('branch')}
                      </span>
                    </Label>
                    <select
                      id="branchId"
                      name="branchId"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      required
                      disabled={loading}
                      className={selectClass}
                    >
                      <option value="" disabled>{t('selectBranch')}</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                          {branch.isHeadQuarter ? ` (${t('hq')})` : ''}
                          {branch.city ? ` — ${branch.city}` : ''}
                          {branch.code ? ` [${branch.code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="current-password"
                    required
                    onFocus={handlePasswordFocus}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading || !selectedOrg || (branches.length > 0 && !selectedBranch)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('signingIn')}
                    </>
                  ) : (
                    t('signIn')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('noAccount')}{' '}
            <a href="/auth/signup" className="text-blue-600 hover:underline font-medium">
              {t('contactAdmin')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
