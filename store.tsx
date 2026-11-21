import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from './api'
import type { AnalysisResult, EngineInfo, Health } from './types'

type BackendState = 'checking' | 'online' | 'offline'
export interface Toast { id: number; kind: 'success' | 'error' | 'info'; title: string; body?: string }

interface Ctx {
  backend: BackendState
  health: Health | null
  engine: (key: 'tfidf' | 'bert') => EngineInfo | undefined
  refreshHealth: () => Promise<void>
  /** Demo-mode results live only in memory for this tab */
  sessionResults: AnalysisResult[]
  addSessionResult: (r: AnalysisResult) => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
  lastResult: AnalysisResult | null
  setLastResult: (r: AnalysisResult | null) => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<BackendState>('checking')
  const [health, setHealth] = useState<Health | null>(null)
  const [sessionResults, setSession] = useState<AnalysisResult[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null)
  const nextId = useRef(1)

  const refreshHealth = useCallback(async () => {
    try {
      const h = await api.health()
      setHealth(h)
      setBackend('online')
    } catch {
      setHealth(null)
      setBackend('offline')
    }
  }, [])

  useEffect(() => { void refreshHealth() }, [refreshHealth])

  // Poll while BERT is still loading/training so the UI picks it up when ready
  useEffect(() => {
    const busy = health?.engines.some(e => e.status === 'loading' || e.status === 'training')
    const ms = backend === 'offline' ? 30000 : busy ? 8000 : 0
    if (!ms) return
    const t = setInterval(refreshHealth, ms)
    return () => clearInterval(t)
  }, [health, backend, refreshHealth])

  const dismiss = useCallback((id: number) => setToasts(ts => ts.filter(t => t.id !== id)), [])
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++
    setToasts(ts => [...ts.slice(-3), { ...t, id }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const value = useMemo<Ctx>(() => ({
    backend, health, refreshHealth,
    engine: key => health?.engines.find(e => e.key === key),
    sessionResults, addSessionResult: r => setSession(s => [r, ...s].slice(0, 50)),
    toasts, toast, dismiss, lastResult, setLastResult,
  }), [backend, health, refreshHealth, sessionResults, toasts, toast, dismiss, lastResult])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}
