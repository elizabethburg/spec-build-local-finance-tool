// src/components/UploadModal.tsx
export default function UploadModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 text-center space-y-3">
        <p className="font-medium">Upload modal — coming in Step 7</p>
        <button onClick={onClose} className="text-sm text-blue-600">Close</button>
      </div>
    </div>
  )
}
