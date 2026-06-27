import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { Globe, Building2, MapPin, LogOut } from 'lucide-react'
import { selectBranchAction } from './actions'

export default async function SelectBranchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { organizationId: true, fullName: true, role: true },
  })
  if (!profile?.organizationId) redirect('/auth/login')

  const branches = await prisma.branch.findMany({
    where: { organizationId: profile.organizationId, isActive: true },
    select: { id: true, name: true, nameAr: true, code: true, city: true, country: true, isHeadQuarter: true, logoUrl: true },
    orderBy: [{ isHeadQuarter: 'desc' }, { name: 'asc' }],
  })

  if (branches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No branches available</h2>
          <p className="text-gray-500 text-sm mb-6">
            No active branches have been configured for your organization yet.
            Please contact your administrator.
          </p>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center p-12 text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">PayrollPro</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Select Your Branch
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Choose the branch you are working from. All data, payroll runs, and reports
            will be scoped to the selected branch.
          </p>
          <div className="mt-10 flex items-center gap-3 bg-white/10 rounded-xl p-4">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold uppercase">
              {profile.fullName?.[0] ?? 'U'}
            </div>
            <div>
              <p className="font-medium text-sm">{profile.fullName}</p>
              <p className="text-blue-200 text-xs">{profile.role?.replaceAll('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — branch selector */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Globe className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">PayrollPro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Select a branch</h2>
            <p className="text-gray-500 text-sm">
              Welcome back, <span className="font-medium text-gray-700">{profile.fullName}</span>.
              Choose the branch you are working from today.
            </p>
          </div>

          <div className="grid gap-3">
            {branches.map((branch) => (
              <form key={branch.id} action={selectBranchAction.bind(null, branch.id)}>
                <button
                  type="submit"
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      {branch.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={branch.logoUrl} alt={branch.name} className="w-8 h-8 object-contain rounded" />
                      ) : (
                        <Building2 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{branch.name}</span>
                        {branch.nameAr && (
                          <span className="text-xs text-gray-400 font-normal" dir="rtl">{branch.nameAr}</span>
                        )}
                        {branch.isHeadQuarter && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            HQ
                          </span>
                        )}
                        {branch.code && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">
                            {branch.code}
                          </span>
                        )}
                      </div>
                      {(branch.city ?? branch.country) && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span>{[branch.city, branch.country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 self-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </form>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Not the right account?{' '}
            <a href="/auth/login" className="text-blue-600 hover:underline">
              Sign in with a different account
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
