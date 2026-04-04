import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function UploadScreen() {
  const [institution, setInstitution] = useState('My Bank')
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<{ saved: number; duplicates: number } | null>(null)
  const navigate = useNavigate()

  async function handleUpload() {
    if (!file) return
    setState('uploading')
    setMessage('Analyzing your file...')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('institution', institution)

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setState('error')
        setMessage(data.detail || 'Upload failed')
        return
      }
      setResult({ saved: data.saved, duplicates: data.duplicates })
      setState('complete')
      setMessage(data.message)
    } catch (err) {
      setState('error')
      setMessage('Connection error — is the backend running?')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="max-w-md w-full mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Upload your transactions</h1>
          <p className="text-gray-500 text-sm">Export a CSV from your bank and upload it here. Any format works.</p>
        </div>

        {state === 'idle' || state === 'error' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institution name (optional)</label>
              <input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Chase, Amex, Fidelity..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CSV file</label>
              <input
                type="file"
                accept=".csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600"
              />
            </div>
            {state === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{message}</div>
            )}
            <button
              onClick={handleUpload}
              disabled={!file}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              Upload
            </button>
          </div>
        ) : state === 'uploading' ? (
          <div className="text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 text-sm">{message}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 space-y-1">
              <p className="font-medium">Upload complete</p>
              <p>{result?.saved} transactions saved</p>
              {result?.duplicates ? <p>{result.duplicates} duplicates skipped</p> : null}
            </div>
            <button
              onClick={() => navigate('/qa')}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
