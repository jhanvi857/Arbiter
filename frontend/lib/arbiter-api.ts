export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

export type QueryOptimizeResponse = {
  plan_a: {
    sql: string
    predicted_cost_ms: number
    confidence: string
    prediction_std_ms: number
  }
  plan_b: {
    sql: string
    predicted_cost_ms: number
    confidence: string
    prediction_std_ms: number
    suggestion: string
    optimization_type: string | null
  }
  recommendation: 'plan_a' | 'plan_b'
  actual_cost_ms: number
  model_error_ms: number
  latency_savings_ms: number
  execution_time_ms?: number
  row_count?: number
  columns?: string[]
  rows?: unknown[][]
  features?: Record<string, number>
}

export type ExecuteQueryResponse = {
  sql: string
  columns: string[]
  rows: unknown[][]
  row_count: number
  execution_time_ms: number
}

export type ModelStatsResponse = {
  model: string
  mae_ms: number
  r2_score: number
  training_samples: number
  feature_importances: Record<string, number>
}

export type QueryHistoryItem = {
  id: number
  query: string
  features: Record<string, number>
  predicted_cost_ms: number
  actual_cost_ms: number
  timestamp: string
}

type ApiOptions = RequestInit & {
  json?: unknown
}

async function requestJson<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  // Inject standard bearer token header from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(errorBody || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function executeQuery(sql: string) {
  return requestJson<ExecuteQueryResponse>('/query/execute', {
    method: 'POST',
    json: { sql },
  })
}

export function optimizeQuery(sql: string) {
  return requestJson<QueryOptimizeResponse>('/query/optimize', {
    method: 'POST',
    json: { sql },
  })
}

export function fetchModelStats() {
  return requestJson<ModelStatsResponse>('/model/stats')
}

export function fetchQueryHistory() {
  return requestJson<QueryHistoryItem[]>('/query/history')
}

export type DbTableInfo = {
  name: string
  row_count: number
  columns: string[]
}

export type DbStatusResponse = {
  is_demo: boolean
  database_name: string
  size_mb: number
  table_count: number
  tables: DbTableInfo[]
}

export function fetchDatabaseStatus() {
  return requestJson<DbStatusResponse>('/database/status')
}

export function resetDatabase() {
  return requestJson<DbStatusResponse>('/database/reset', {
    method: 'POST',
  })
}

export function uploadDatabase(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return requestJson<DbStatusResponse>('/database/upload', {
    method: 'POST',
    body: formData,
  })
}

export type AuthResponse = {
  token: string
  email: string
  name: string
}

export function loginUser(payload: Record<string, string>) {
  return requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    json: payload,
  })
}

export function signupUser(payload: Record<string, string>) {
  return requestJson<AuthResponse>('/auth/signup', {
    method: 'POST',
    json: payload,
  })
}