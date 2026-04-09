const BASE = "http://localhost:8000";

export class OllamaUnavailableError extends Error {
  constructor() {
    super("Ollama not available")
    this.name = "OllamaUnavailableError"
  }
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, options)
  if (res.status === 503) throw new OllamaUnavailableError()
  return res
}

export async function getAuthStatus(): Promise<{ setup_complete: boolean }> {
  const res = await apiFetch("/auth/status")
  return res.json()
}

export async function setupAuth(name: string, pin: string, confirm_pin: string) {
  const res = await apiFetch("/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, pin, confirm_pin }),
  })
  if (!res.ok) throw new Error((await res.json()).detail)
  return res.json() // { recovery_phrase, session_token }
}

export async function unlockAuth(pin: string) {
  const res = await apiFetch("/auth/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  })
  if (!res.ok) throw new Error((await res.json()).detail)
  return res.json() // { session_token }
}

export async function getAppStatus(): Promise<{ has_transactions: boolean }> {
  const res = await apiFetch("/status")
  return res.json()
}

export async function uploadCSV(file: File, institution: string) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("institution", institution)
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
  })
  if (res.status === 503) throw new OllamaUnavailableError()
  if (!res.ok) throw new Error((await res.json()).detail)
  return res.json()
}

export async function getUploadStatus() {
  const res = await apiFetch("/upload/status")
  return res.json()
}

export async function startCategorization() {
  const res = await apiFetch('/categorize/start', { method: 'POST' })
  return res.json()
}

export async function getNextQACard() {
  const res = await apiFetch('/qa/next')
  return res.json()
}

export async function submitQAAnswer(transaction_id: number, merchant: string, category: string) {
  const res = await apiFetch('/qa/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id, merchant, category }),
  })
  return res.json()
}

export async function bulkApplyCategory(merchant_raw: string, merchant: string, category: string) {
  const res = await apiFetch('/qa/bulk-apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchant_raw, merchant, category }),
  })
  return res.json()
}

export async function getTransactions() {
  const res = await apiFetch('/transactions')
  return res.json()
}

export async function getInstitutions() {
  const res = await apiFetch('/institutions')
  return res.json()
}

export async function renameInstitution(id: number, name: string) {
  const res = await apiFetch(`/institutions/${id}/name`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function updateTransactionCategory(id: number, category: string) {
  const res = await apiFetch(`/transactions/${id}/category`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  })
  return res.json()
}

export async function bulkUpdateCategory(merchant_raw: string, category: string, merchant?: string) {
  const res = await apiFetch('/transactions/bulk-category', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchant_raw, category, merchant }),
  })
  return res.json()
}

export async function getDashboard(period: string = '30d') {
  const res = await apiFetch(`/dashboard?period=${period}`)
  return res.json()
}

export async function getInsight(): Promise<{ text: string | null; seen: boolean; id?: number }> {
  const res = await apiFetch('/insight')
  return res.json()
}

export async function dismissInsight() {
  await apiFetch('/insight/dismiss', { method: 'POST' })
}

export async function getSettings(): Promise<Record<string, string>> {
  const res = await apiFetch('/settings')
  return res.json()
}

export async function updateName(name: string) {
  const res = await apiFetch('/settings/name', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function updateInsightMode(mode: 'always' | 'new_only') {
  const res = await apiFetch('/settings/insight-mode', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
  return res.json()
}

export async function getCategories(): Promise<string[]> {
  const res = await apiFetch('/categories')
  return res.json()
}

export interface Rule {
  id: number
  vendor_pattern: string
  merchant_name: string
  category: string
  confidence: string
  times_applied: number
}

export async function getRules(): Promise<Rule[]> {
  const res = await apiFetch('/rules')
  return res.json()
}

export async function updateRule(
  id: number,
  updates: { vendor_pattern?: string; merchant_name?: string; category?: string }
) {
  const res = await apiFetch(`/rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return res.json()
}

export async function deleteRule(id: number) {
  const res = await apiFetch(`/rules/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function changePIN(current_pin: string, new_pin: string, confirm_new_pin: string) {
  const res = await apiFetch('/auth/change-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_pin, new_pin, confirm_new_pin }),
  })
  if (!res.ok) throw new Error((await res.json()).detail)
  return res.json()
}

let _sessionToken: string | null = null
export function setSessionToken(token: string) { _sessionToken = token }
export function getSessionToken() { return _sessionToken }
export function clearSession() { _sessionToken = null }

export async function deleteTransaction(id: number) {
  const res = await apiFetch(`/transactions/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error((await res.json()).detail)
  return res.json()
}

export async function deleteInstitutionTransactions(institutionName: string) {
  const res = await apiFetch(`/transactions/by-institution/${encodeURIComponent(institutionName)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error((await res.json()).detail)
  return res.json()
}
