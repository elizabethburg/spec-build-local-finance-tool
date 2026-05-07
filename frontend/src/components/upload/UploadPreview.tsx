import { Button } from '../ui/Button'

interface UploadPreviewProps {
  preview: {
    rows_found: number
    date_range: string
    account_type_confirmed: string
    institution: string
    sample: Record<string, string>[]
  }
  onConfirm: () => void
  onBack: () => void
  confirming: boolean
}

export function UploadPreview({ preview, onConfirm, onBack, confirming }: UploadPreviewProps) {
  const sampleHeaders = preview.sample.length > 0 ? Object.keys(preview.sample[0]) : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#F8F7FF] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Transactions</p>
          <p className="text-2xl font-semibold text-[#1A1535]">{preview.rows_found}</p>
        </div>
        <div className="bg-[#F8F7FF] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Date Range</p>
          <p className="text-sm font-medium text-[#1A1535]">{preview.date_range}</p>
        </div>
        <div className="bg-[#F8F7FF] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Account Type</p>
          <p className="text-sm font-medium text-[#1A1535]">{preview.account_type_confirmed}</p>
        </div>
        <div className="bg-[#F8F7FF] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Institution</p>
          <p className="text-sm font-medium text-[#1A1535]">{preview.institution}</p>
        </div>
      </div>

      {preview.sample.length > 0 && (
        <div>
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Sample rows</p>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {sampleHeaders.slice(0, 4).map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[#94A3B8] text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {sampleHeaders.slice(0, 4).map(h => (
                      <td key={h} className="px-3 py-2 text-[#4B5563] truncate max-w-[120px]">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} disabled={confirming}>Back</Button>
        <Button onClick={onConfirm} disabled={confirming} className="flex-1">
          {confirming ? 'Importing...' : 'Confirm import'}
        </Button>
      </div>
    </div>
  )
}
