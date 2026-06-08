import Link from 'next/link'
import { FileSearch } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <FileSearch className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-700 mb-3">Page Not Found</h2>
        <p className="text-gray-500 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
