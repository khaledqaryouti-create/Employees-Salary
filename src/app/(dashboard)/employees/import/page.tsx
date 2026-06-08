'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'

interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export default function ImportEmployeesPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.csv'))) {
      setFile(f)
      setResult(null)
    } else {
      toast.error('Please upload an Excel (.xlsx) or CSV (.csv) file')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setResult(null)
    }
  }

  async function handleImport() {
    if (!file) return
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json() as { ok: boolean; data?: ImportResult; message?: string }

      if (!json.ok) {
        toast.error(json.message ?? 'Import failed')
        return
      }

      setResult(json.data ?? null)

      if (json.data && json.data.created + json.data.updated > 0) {
        toast.success(`Import complete: ${json.data.created} created, ${json.data.updated} updated`)
      }
    } catch {
      toast.error('Import failed. Please check your file and try again.')
    } finally {
      setUploading(false)
    }
  }

  async function downloadTemplate() {
    const res = await fetch('/api/employees/import?template=1')
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employee-import-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/employees" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Employees</h1>
          <p className="text-sm text-gray-500">Upload an Excel or CSV file to add employees in bulk</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Before You Start</CardTitle>
          <CardDescription>Download and fill the template to ensure the correct format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600 space-y-1">
            <p>The file must contain these columns:</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {['employeeNumber', 'fullName', 'email', 'country', 'employmentType', 'joinDate', 'basicSalary', 'currency'].map((col) => (
                <code key={col} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{col}</code>
              ))}
              <span className="text-xs text-gray-400 self-center ml-1">+ optional: phone, nationality, department, jobTitle</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          file ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <CardContent className="py-10 text-center">
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div className="text-left">
                <p className="font-medium text-sm text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                className="ml-4 text-gray-400 hover:text-gray-600"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Drop your file here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Supports .xlsx and .csv files</p>
            </>
          )}
        </CardContent>
      </Card>
      <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />

      {/* Result */}
      {result && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">{result.created} created</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">{result.updated} updated</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">{result.failed} failed</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                    <Badge variant="secondary" className="text-xs shrink-0">Row {e.row}</Badge>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            )}
            {result.created + result.updated > 0 && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => { router.push('/employees'); router.refresh() }}
              >
                View Employees
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <LinkButton variant="outline" href="/employees">Cancel</LinkButton>
        <Button
          onClick={handleImport}
          disabled={!file || uploading}
          className="min-w-[160px]"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Import Employees</>
          )}
        </Button>
      </div>
    </div>
  )
}
