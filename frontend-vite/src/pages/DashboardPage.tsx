import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

type FileRow = {
  id: string
  name: string
  mime_type: string | null
  size: number
  created_at: string
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [files, setFiles] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const totalSize = useMemo(() => files.reduce((acc, f) => acc + (f.size || 0), 0), [files])

  const loadFiles = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get('/files')
      setFiles(res.data.files || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || null))
    loadFiles()
  }, [])

  const onLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    const form = new FormData()
    form.append('file', file)

    try {
      await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
      await loadFiles()
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const onDownload = async (id: string) => {
    try {
      const res = await api.get(`/files/${id}/download`)
      const url = res.data.url
      window.open(url, '_blank')
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Download failed')
    }
  }

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/files/${id}`)
      await loadFiles()
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Delete failed')
    }
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Signed in as {email || '—'}</p>
          </div>
          <button className="text-sm px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50" onClick={onLogout}>
            Logout
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Files</p>
            <p className="text-lg font-semibold mt-1">{files.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Total size</p>
            <p className="text-lg font-semibold mt-1">{formatSize(totalSize)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Upload</p>
            <label className="mt-2 inline-flex items-center justify-center px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onUpload(f)
                  e.currentTarget.value = ''
                }}
                disabled={uploading}
              />
              {uploading ? `Uploading ${uploadProgress}%` : 'Choose file'}
            </label>
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm font-semibold">Your files</p>
            <button className="text-sm text-blue-600 hover:underline" onClick={loadFiles} disabled={loading}>
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Size</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Uploaded</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{f.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.mime_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatSize(f.size)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(f.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="text-sm px-2 py-1 rounded hover:bg-gray-100" onClick={() => onDownload(f.id)}>
                          Download
                        </button>
                        <button className="text-sm px-2 py-1 rounded text-red-600 hover:bg-red-50" onClick={() => onDelete(f.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && files.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                      No files uploaded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
