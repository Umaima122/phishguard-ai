import type { AnalysisResult, AnalyzeRequest, Health, HistoryItem, Stats, UrlReport } from './types'

/** Same origin in production (FastAPI serves the app). Override with VITE_API_URL for a separate backend. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 20000): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(BASE + path, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...init?.headers } })
    if (!res.ok) {
      let msg = res.statusText
      try { const j = await res.json(); msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail) } catch { /* not json */ }
      throw new ApiError(res.status, msg)
    }
    const type = res.headers.get('content-type') || ''
    if (!type.includes('application/json')) throw new ApiError(0, 'Backend not reachable')
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(0, e instanceof DOMException && e.name === 'AbortError' ? 'Request timed out' : 'Backend not reachable')
  } finally { clearTimeout(t) }
}

export const api = {
  health: () => req<Health>('/api/health', undefined, 5000),
  analyze: (body: AnalyzeRequest) => req<AnalysisResult>('/api/analyze', { method: 'POST', body: JSON.stringify(body) }, 60000),
  inspectUrl: (url: string) => req<UrlReport>('/api/url', { method: 'POST', body: JSON.stringify({ url }) }),
  history: (p: { q?: string; classification?: string; level?: string } = {}) =>
    req<HistoryItem[]>('/api/history?' + new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][])),
  historyItem: (id: string) => req<HistoryItem>(`/api/history/${id}`),
  deleteHistory: (id: string) => req<{ deleted: number }>(`/api/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => req<{ deleted: number }>('/api/history', { method: 'DELETE' }),
  stats: () => req<Stats>('/api/stats'),
}
