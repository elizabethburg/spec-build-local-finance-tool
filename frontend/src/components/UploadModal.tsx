import { useState } from 'react'
import QACard from './QACard'
import { getNextQACard, submitQAAnswer, bulkApplyCategory } from '../lib/api'

interface UploadModalProps {
  onClose: () => void
}

type Phase = 'upload' | 'uploading' | 'qa' | 'bulk-apply' | 'done' | 'error'

export default function UploadModal({ onClose }: UploadModalProps) {
  const [phase, setPhase] = useState<Phase>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [institution, setInstitution] = useState('My Bank')
  const [message, setMessage] = useState('')
  const [uploadResult, setUploadResult] = useState<{ saved: number; duplicates: number } | null>(null)
  const [card, setCard] = useState<any>(null)
  const [progress, setProgress] = useState({ current: 1, total: 1 })
  const [pendingAnswer, setPendingAnswer] = useState<{ merchant: string; category: string } | null>(null)
  const [similarCount, setSimilarCount] = useState(0)
  const [similarMerchantRaw, setSimilarMerchantRaw] = useState('')
  const [summary, setSummary] = useState({ categorized: 0, total: 0 })

  async function handleUpload() {
    if (!file) return
    setPhase('uploading')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('institution', institution)
    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setMessage(data.detail || 'Upload failed'); setPhase('error'); return }
      setUploadResult({ saved: data.saved, duplicates: data.duplicates })
      await fetchNextCard()
    } catch {
      setMessage('Connection error'); setPhase('error')
    }
  }

  async function fetchNextCard() {
    const data = await getNextQACard()
    if (data.done) {
      setSummary({ categorized: data.categorized, total: data.total })
      setPhase('done')
    } else {
      setCard(data.card)
      setProgress(data.progress)
      setPhase('qa')
    }
  }

  async function handleAnswer(merchant: string, category: string) {
    if (!card) return
    const result = await submitQAAnswer(card.id, merchant, category)
    if (result.similar_count > 0) {
      setPendingAnswer({ merchant, category })
      setSimilarCount(result.similar_count)
      setSimilarMerchantRaw(result.similar_merchant_raw)
      setPhase('bulk-apply')
    } else {
      await fetchNextCard()
    }
  }

  async function handleBulkApply(apply: boolean) {
    if (apply && pendingAnswer && similarMerchantRaw) {
      await bulkApplyCategory(similarMerchantRaw, pendingAnswer.merchant, pendingAnswer.category)
    }
    await fetchNextCard()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Upload transactions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          {phase === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Institution name</label>
                <input type="text" value={institution} onChange={e => setInstitution(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CSV file</label>
                <input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm" />
              </div>
              <button onClick={handleUpload} disabled={!file}
                className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-700">
                Upload
              </button>
            </div>
          )}
          {phase === 'uploading' && (
            <div className="text-center space-y-3 py-4">
              <div className="animate-spin w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500">Analyzing your file...</p>
            </div>
          )}
          {phase === 'qa' && card && (
            <QACard card={card} progress={progress} onAnswer={handleAnswer} />
          )}
          {phase === 'bulk-apply' && pendingAnswer && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{similarCount}</span> other transactions from this vendor. Apply <strong>{pendingAnswer.category}</strong> to all?
              </p>
              <div className="space-y-2">
                <button onClick={() => handleBulkApply(true)} className="w-full text-left px-4 py-3 rounded-lg border border-blue-300 bg-blue-50 text-sm">
                  <span className="font-medium text-blue-600 mr-2">A</span> Yes, update all
                </button>
                <button onClick={() => handleBulkApply(false)} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-sm">
                  <span className="font-medium text-blue-600 mr-2">B</span> No thanks
                </button>
              </div>
            </div>
          )}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{message}</div>
              <button onClick={() => setPhase('upload')} className="w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Try again</button>
            </div>
          )}
          {phase === 'done' && (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 space-y-1">
                <p className="font-medium">Done!</p>
                {uploadResult && <p>{uploadResult.saved} transactions saved{uploadResult.duplicates > 0 ? `, ${uploadResult.duplicates} duplicates skipped` : ''}</p>}
                <p>{summary.categorized} categorized</p>
              </div>
              <button onClick={onClose} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
