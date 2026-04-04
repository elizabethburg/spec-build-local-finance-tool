import { useRef, useState } from 'react'

interface FileDropzoneProps {
  onFile: (file: File) => void
  file: File | null
}

export default function FileDropzone({ onFile, file }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) onFile(picked)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        w-full rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors
        ${dragging
          ? 'border-blue-400 bg-blue-50'
          : file
          ? 'border-green-400 bg-green-50'
          : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
      {file ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-green-700">{file.name}</p>
          <p className="text-xs text-green-600">Click to choose a different file</p>
        </div>
      ) : (
        <div className="space-y-1">
          <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">Click to browse or drag a file here</p>
          <p className="text-xs text-gray-400">CSV files only</p>
        </div>
      )}
    </div>
  )
}
