const BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vantage_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Auth
  authStatus: () => request<{ setup_complete: boolean; locked: boolean }>('/auth/status'),
  setup: (name: string, pin: string) =>
    request<{ session_token: string; recovery_phrase: string[] }>('/auth/setup', {
      method: 'POST', body: JSON.stringify({ name, pin }),
    }),
  unlock: (pin: string) =>
    request<{ session_token: string }>('/auth/unlock', {
      method: 'POST', body: JSON.stringify({ pin }),
    }),
  changePin: (current_pin: string, new_pin: string) =>
    request('/auth/change-pin', { method: 'POST', body: JSON.stringify({ current_pin, new_pin }) }),

  // Accounts
  getAccounts: () => request<Account[]>('/accounts'),
  createAccount: (body: { institution_name: string; name: string; type: string; last_four?: string }) =>
    request<Account>('/accounts', { method: 'POST', body: JSON.stringify(body) }),
  updateAccount: (id: number, body: { name?: string; is_active?: boolean }) =>
    request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAccountBalance: (id: number) =>
    request<{ balance: number; as_of: string }>(`/accounts/${id}/balance`),

  // Uploads
  initiateUpload: (body: {
    account_id?: number; filename: string;
    institution_name?: string; account_name?: string; account_type?: string;
  }) => request<{ upload_id: number }>('/uploads/initiate', { method: 'POST', body: JSON.stringify(body) }),
  uploadFile: (upload_id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = localStorage.getItem('vantage_token')
    return fetch(`${BASE}/uploads/${upload_id}/file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(r => r.json())
  },
  confirmUpload: (upload_id: number) =>
    request<UploadConfirmResult>(`/uploads/${upload_id}/confirm`, { method: 'POST' }),
  getUploads: () => request<UploadRecord[]>('/uploads'),

  // Dashboard
  getDashboard: (period = 'this_month') => request<DashboardData>(`/dashboard?period=${period}`),

  // Transactions
  getTransactions: (params: {
    account_id?: number; category?: string; from?: string; to?: string; search?: string;
  } = {}) => {
    const q = new URLSearchParams()
    if (params.account_id) q.set('account_id', String(params.account_id))
    if (params.category) q.set('category', params.category)
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.search) q.set('search', params.search)
    return request<Transaction[]>(`/transactions?${q}`)
  },
  updateTransaction: (id: number, body: { merchant?: string; category?: string; notes?: string }) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  splitTransaction: (id: number, splits: { category: string; amount: number }[]) =>
    request<Transaction>(`/transactions/${id}/split`, { method: 'POST', body: JSON.stringify({ splits }) }),
  deleteTransaction: (id: number) =>
    request(`/transactions/${id}`, { method: 'DELETE' }),
  bulkDeleteTransactions: (ids: number[]) =>
    request(`/transactions/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids }) }),

  // Q&A
  getNextQA: () => request<QACard | { done: true }>('/qa/next'),
  answerQA: (body: { transaction_id: number; merchant: string; category: string; account_type: string; apply_to_similar?: boolean }) =>
    request<{ applied: number; remaining: number }>('/qa/answer', { method: 'POST', body: JSON.stringify(body) }),

  // Settings
  getRules: () => request<Rule[]>('/rules'),
  updateRule: (id: number, body: { vendor_pattern?: string; merchant_name?: string; category?: string }) =>
    request<Rule>(`/rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRule: (id: number) => request(`/rules/${id}`, { method: 'DELETE' }),
  getInstitutions: () => request<Institution[]>('/institutions'),
  updateInstitution: (id: number, name_display: string) =>
    request<Institution>(`/institutions/${id}`, { method: 'PATCH', body: JSON.stringify({ name_display }) }),
  ollamaStatus: () => request<{ available: boolean; active_model: string | null; available_models: string[] }>('/ollama/status'),
}

// Types
export interface Account {
  id: number
  institution_id: number
  name: string
  type: string
  account_class: string
  last_four?: string
  is_active: boolean
  institution?: { id: number; name_raw: string; name_display: string }
}

export interface Transaction {
  id: number
  account_id: number
  date: string
  merchant_raw: string
  merchant?: string
  category?: string
  amount: number
  categorized: boolean
  notes?: string
  is_split: boolean
  split_items?: { id: number; category: string; amount: number }[]
}

export interface UploadConfirmResult {
  saved: number
  duplicates: number
  net_worth: number
  net_worth_delta?: number
  has_qa_queue: boolean
  ai_categorized: number
  qa_count: number
  insight?: string
}

export interface UploadRecord {
  id: number
  account_id: number
  filename: string
  uploaded_at: string
  rows_found: number
  rows_saved: number
  rows_duplicate: number
  status: string
}

export interface DashboardData {
  net_worth: number
  net_worth_delta?: number
  total_assets: number
  total_liabilities: number
  accounts: { id: number; name: string; type: string; balance: number }[]
  net_worth_history: { date: string; net_worth: number }[]
  daily_cashflow: { date: string; income: number; expenses: number }[]
  categories_current: { name: string; amount: number; percent: number }[]
  categories_previous: { name: string; amount: number }[]
  insight?: { text: string; type: string } | null
}

export interface QACard {
  type: string
  transaction_id: number
  merchant_raw: string
  amount: number
  date: string
  account_type: string
  suggested_merchant?: string
  suggested_category?: string
}

export interface Rule {
  id: number
  vendor_pattern: string
  merchant_name: string
  category: string
  account_type: string
  confidence: string
  times_applied: number
}

export interface Institution {
  id: number
  name_raw: string
  name_display: string
}
