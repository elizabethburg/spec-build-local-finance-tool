import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { FileDropzone } from '../components/upload/FileDropzone'
import { AccountSelector } from '../components/upload/AccountSelector'
import { UploadPreview } from '../components/upload/UploadPreview'
import { useUpload } from '../hooks/useUpload'
import { formatCurrency } from '../lib/format'
import { useNavigate } from 'react-router-dom'

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const upload = useUpload()
  const navigate = useNavigate()

  async function handleAccountSelected(params: {
    account_id?: number; institution_name?: string; account_name?: string; account_type?: string;
  }) {
    if (!file) return
    const uploadId = await upload.initiate({ ...params, filename: file.name })
    await upload.uploadFile(uploadId, file)
  }

  const stepNumber = (() => {
    if (upload.step === 'idle' || upload.step === 'initiated') return 1
    if (upload.step === 'preview') return 2
    return 3
  })()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-[#1A1535]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Import Statement
        </h1>
        <span className="text-sm text-[#94A3B8]">Step {stepNumber} of 3</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#4F3FF0] rounded-full transition-all duration-500"
          style={{ width: `${(stepNumber / 3) * 100}%` }}
        />
      </div>

      <Card>
        {/* Step 1: File + Account */}
        {upload.step === 'idle' && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-3">1. Select your file</p>
              <FileDropzone onFile={f => setFile(f)} />
              {file && (
                <p className="text-sm text-[#2ECC8F] mt-2">✓ {file.name}</p>
              )}
            </div>
            {file && (
              <div>
                <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-3">2. Select account</p>
                <AccountSelector onSelect={handleAccountSelected} />
              </div>
            )}
          </div>
        )}

        {/* Step 1 loading */}
        {upload.step === 'initiated' && (
          <div className="py-8 text-center text-[#94A3B8]">Analyzing your file...</div>
        )}

        {/* Step 2: Preview */}
        {upload.step === 'preview' && upload.preview && upload.uploadId && (
          <div>
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">Preview</p>
            <UploadPreview
              preview={upload.preview as Parameters<typeof UploadPreview>[0]['preview']}
              onConfirm={() => upload.confirm(upload.uploadId!)}
              onBack={upload.reset}
              confirming={upload.step === 'confirming'}
            />
          </div>
        )}

        {upload.step === 'confirming' && (
          <div className="py-8 text-center">
            <div className="text-[#4F3FF0] text-lg font-medium">Importing your transactions...</div>
            <p className="text-[#94A3B8] text-sm mt-2">This may take a moment while AI categorizes your data.</p>
          </div>
        )}

        {/* Step 3: Done */}
        {upload.step === 'done' && upload.result && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#EAE8FD] flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <div>
              <p className="font-semibold text-[#1A1535] text-lg">
                {upload.result.saved} transaction{upload.result.saved !== 1 ? 's' : ''} added
              </p>
              {upload.result.duplicates > 0 && (
                <p className="text-[#94A3B8] text-sm mt-0.5">{upload.result.duplicates} duplicates skipped</p>
              )}
            </div>

            {upload.result.net_worth_delta !== undefined && (
              <div className="bg-[#F8F7FF] rounded-xl p-4">
                <p className="text-xs text-[#94A3B8] mb-1">Net worth changed</p>
                <p className={`text-2xl font-semibold tabular-nums ${(upload.result.net_worth_delta || 0) >= 0 ? 'text-[#2ECC8F]' : 'text-[#F06B6B]'}`}>
                  {(upload.result.net_worth_delta || 0) >= 0 ? '+' : ''}{formatCurrency(upload.result.net_worth_delta || 0)}
                </p>
              </div>
            )}

            {upload.result.insight && (
              <div className="rounded-xl p-4 border text-left" style={{ backgroundColor: '#9B6DFF11', borderColor: '#9B6DFF33' }}>
                <p className="text-sm" style={{ color: '#5B3FCC' }}>{upload.result.insight}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              {upload.result.has_qa_queue && (
                <button
                  onClick={() => navigate('/qa')}
                  className="px-5 py-2.5 bg-[#4F3FF0] text-white rounded-xl font-medium hover:bg-[#7B6FF5] transition-colors"
                >
                  Review transactions →
                </button>
              )}
              <button
                onClick={() => { upload.reset(); navigate('/dashboard') }}
                className="px-5 py-2.5 bg-[#EAE8FD] text-[#4F3FF0] rounded-xl font-medium hover:bg-[#d4d0fa] transition-colors"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        )}

        {upload.step === 'error' && (
          <div className="py-4 space-y-4">
            <p className="text-[#F06B6B]">{upload.error}</p>
            <button onClick={upload.reset} className="text-[#4F3FF0] text-sm hover:underline">
              Try again
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
