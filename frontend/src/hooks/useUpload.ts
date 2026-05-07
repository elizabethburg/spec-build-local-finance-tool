import { useState } from 'react'
import { api, UploadConfirmResult } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'

export type UploadStep = 'idle' | 'initiated' | 'preview' | 'confirming' | 'done' | 'error'

export function useUpload() {
  const [step, setStep] = useState<UploadStep>('idle')
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [result, setResult] = useState<UploadConfirmResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  async function initiate(params: {
    account_id?: number; filename: string;
    institution_name?: string; account_name?: string; account_type?: string;
  }) {
    setError(null)
    const res = await api.initiateUpload(params)
    setUploadId(res.upload_id)
    setStep('initiated')
    return res.upload_id
  }

  async function uploadFile(uploadId: number, file: File) {
    const prev = await api.uploadFile(uploadId, file)
    setPreview(prev)
    setStep('preview')
    return prev
  }

  async function confirm(uploadId: number) {
    setStep('confirming')
    try {
      const res = await api.confirmUpload(uploadId)
      setResult(res)
      setStep('done')
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      return res
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStep('error')
      throw e
    }
  }

  function reset() {
    setStep('idle')
    setUploadId(null)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  return { step, uploadId, preview, result, error, initiate, uploadFile, confirm, reset }
}
