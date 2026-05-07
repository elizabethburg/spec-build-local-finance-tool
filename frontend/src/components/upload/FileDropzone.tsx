import { useRef, useState, DragEvent, ChangeEvent } from 'react'

interface FileDropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function FileDropzone({ onFile, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) onFile(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
        dragging ? 'border-[#4F3FF0] bg-[#EAE8FD]' : 'border-gray-200 hover:border-[#4F3FF0] hover:bg-[#F8F7FF]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="text-4xl mb-3">📄</div>
      <p className="text-[#1A1535] font-medium">Drop your CSV here</p>
      <p className="text-[#94A3B8] text-sm mt-1">or click to browse</p>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />
    </div>
  )
}
