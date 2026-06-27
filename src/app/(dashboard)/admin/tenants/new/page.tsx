'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import { Loader2, ArrowLeft, Building2 } from 'lucide-react'

const COUNTRIES = [
  'SA', 'AE', 'KW', 'BH', 'QA', 'OM',
  'IN', 'PH', 'SG', 'MY', 'ID', 'JP', 'CN',
  'EG', 'MA', 'TN', 'LY', 'IT',
]

const COUNTRY_LABELS: Record<string, string> = {
  SA: 'Saudi Arabia', AE: 'United Arab Emirates', KW: 'Kuwait',
  BH: 'Bahrain', QA: 'Qatar', OM: 'Oman',
  IN: 'India', PH: 'Philippines', SG: 'Singapore',
  MY: 'Malaysia', ID: 'Indonesia', JP: 'Japan', CN: 'China',
  EG: 'Egypt', MA: 'Morocco', TN: 'Tunisia', LY: 'Libya', IT: 'Italy',
}

function autoSlug(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, '-').replaceAll(/-+/g, '-').replace(/^-|-$/g, '')
}

function isValidEmail(value: string): boolean {
  const atIndex = value.indexOf('@')
  if (atIndex <= 0) return false
  if (atIndex !== value.lastIndexOf('@')) return false
  const domain = value.slice(atIndex + 1)
  const dotIndex = domain.lastIndexOf('.')
  return dotIndex > 0 && dotIndex < domain.length - 1
}

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [country, setCountry] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e['name'] = 'Organization name is required'
    if (!slug.trim()) e['slug'] = 'Slug is required'
    if (!/^[a-z0-9-]+$/.test(slug)) e['slug'] = 'Slug must be lowercase letters, numbers and hyphens only'
    if (!adminEmail.trim()) e['adminEmail'] = 'Admin email is required'
    if (adminEmail && !isValidEmail(adminEmail)) e['adminEmail'] = 'Invalid email'
    if (!adminName.trim()) e['adminName'] = 'Admin name is required'
    return e
  }

  async function handleCreate() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, country: country || null, adminEmail, adminName }),
      })
      const json = await res.json() as { ok: boolean; message?: string; data?: { id: string } }

      if (!json.ok) {
        toast.error(json.message ?? 'Failed to create tenant')
        return
      }

      toast.success(`Tenant "${name}" created successfully`)
      router.push('/admin/tenants')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/admin/tenants" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Tenant</h1>
          <p className="text-sm text-gray-500">Create a new organization with its first admin</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Organization Details</CardTitle>
              <CardDescription>This will be visible to all users of this tenant</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!slug || slug === autoSlug(name)) setSlug(autoSlug(e.target.value))
              }}
              placeholder="Acme Corporation"
            />
            {errors['name'] && <p className="text-xs text-red-500">{errors['name']}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">
              Slug <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-md text-sm text-gray-400">
                payrollpro.app/
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(autoSlug(e.target.value))}
                placeholder="acme-corp"
                className="rounded-l-none"
              />
            </div>
            {errors['slug'] && <p className="text-xs text-red-500">{errors['slug']}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Primary Country (optional)</Label>
                <Select onValueChange={(v) => { if (typeof v === 'string' && v) setCountry(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{COUNTRY_LABELS[c] ?? c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tenant Admin</CardTitle>
          <CardDescription>
            An invitation will be sent to this email to set up their account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Admin Full Name <span className="text-red-500">*</span></Label>
            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Jane Smith" />
            {errors['adminName'] && <p className="text-xs text-red-500">{errors['adminName']}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Admin Email <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@acme.com"
            />
            {errors['adminEmail'] && <p className="text-xs text-red-500">{errors['adminEmail']}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <LinkButton variant="outline" href="/admin/tenants">Cancel</LinkButton>
        <Button onClick={handleCreate} disabled={loading} className="min-w-[160px]">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
          ) : (
            'Create Tenant'
          )}
        </Button>
      </div>
    </div>
  )
}
