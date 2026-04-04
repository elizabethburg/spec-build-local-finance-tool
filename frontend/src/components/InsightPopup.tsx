import { useEffect, useState } from 'react'
import { getInsight, dismissInsight } from '../lib/api'

export default function InsightPopup() {
  const [text, setText] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    getInsight().then(({ text }) => {
      if (text) {
        setText(text)
        setVisible(true)
      }
    })
  }, [])

  async function handleDismiss() {
    setVisible(false)
    await dismissInsight()
  }

  if (!visible || !text) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5 flex-shrink-0">✦</span>
            <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-300 hover:text-gray-500 flex-shrink-0 text-lg leading-none"
            aria-label="Dismiss insight"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
