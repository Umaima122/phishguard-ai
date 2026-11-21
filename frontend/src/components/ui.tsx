import { AnimatePresence, animate, motion, useInView } from 'framer-motion'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../lib/store'
import type { Severity, ThreatLevel } from '../lib/types'

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00E5FF" /><stop offset="1" stopColor="#8B5CF6" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill="#0D1422" stroke="rgb(148 163 194 / .18)" />
      <path d="M16 5.5l8.5 3.3v6.5c0 5.3-3.6 9.4-8.5 11.1-4.9-1.7-8.5-5.8-8.5-11.1V8.8z" fill="none" stroke="url(#lg)" strokeWidth="1.8" />
      <circle cx="16" cy="15.5" r="3.2" fill="none" stroke="#00E5FF" strokeWidth="1.6" />
      <path d="M18.4 17.9l2.4 2.4" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export const sevStyle: Record<Severity, string> = {
  high: 'text-danger border-danger/30 bg-danger/10',
  medium: 'text-warn border-warn/30 bg-warn/10',
  low: 'text-dim border-line-strong bg-white/[0.03]',
}
export const levelStyle: Record<ThreatLevel, { text: string; chip: string; hex: string }> = {
  Critical: { text: 'text-crit', chip: 'text-crit border-crit/40 bg-crit/10', hex: '#ef4444' },
  High: { text: 'text-danger', chip: 'text-danger border-danger/40 bg-danger/10', hex: '#f87171' },
  Medium: { text: 'text-warn', chip: 'text-warn border-warn/40 bg-warn/10', hex: '#f59e0b' },
  Low: { text: 'text-safe', chip: 'text-safe border-safe/40 bg-safe/10', hex: '#10b981' },
}

export function SevBadge({ s }: { s: Severity }) {
  return <span className={`chip shrink-0 self-start capitalize ${sevStyle[s]}`}>{s}</span>
}

export function DemoBadge({ label = 'Demo data' }: { label?: string }) {
  return <span className="chip border-warn/40 bg-warn/10 text-warn">{label}</span>
}

export function SectionHeader({ eyebrow, title, sub, right }: { eyebrow: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="eyebrow mb-3">{eyebrow}</div>
        <h1 className="h-display text-3xl font-semibold md:text-4xl">{title}</h1>
        {sub && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-dim">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Counter({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setV })
    return () => c.stop()
  }, [inView, value])
  return <span ref={ref}>{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-[3px] border border-line bg-white/[0.03] text-cyan">{icon}</div>
      <div className="font-display text-lg font-medium">{title}</div>
      <p className="mt-1.5 max-w-sm text-sm text-dim">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal className={`panel relative max-h-[88vh] w-full overflow-hidden rounded-b-none sm:rounded-[4px] ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'} bg-deep`}
            initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="font-display text-base font-medium">{title}</div>
              <button className="btn-quiet btn !p-1.5" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="max-h-[calc(88vh-60px)] overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useApp()
  const icon = { success: <CircleCheck size={18} className="text-safe" />, error: <CircleAlert size={18} className="text-danger" />, info: <Info size={18} className="text-cyan" /> }
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
            className="panel pointer-events-auto flex items-start gap-3 bg-deep/95 px-4 py-3">
            <div className="mt-0.5">{icon[t.kind]}</div>
            <div className="min-w-0 flex-1"><div className="text-sm font-medium">{t.title}</div>{t.body && <div className="mt-0.5 text-[13px] text-dim">{t.body}</div>}</div>
            <button className="text-faint hover:text-fg" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={15} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-[2px] border border-line bg-deep px-2.5 py-1.5 text-xs leading-snug text-dim opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100">{text}</span>
    </span>
  )
}

export function BackendPill() {
  const { backend, engine } = useApp()
  const bert = engine('bert')
  if (backend === 'checking') return <span className="chip border-line text-dim"><span className="h-1.5 w-1.5 animate-pulse rounded-[1px] bg-dim" />Connecting</span>
  if (backend === 'offline') return <Tip text="The Python backend isn't reachable. Analyses use a labelled browser heuristic."><span className="chip border-warn/40 bg-warn/10 text-warn"><span className="h-1.5 w-1.5 rounded-[1px] bg-warn" />Demo mode</span></Tip>
  const busy = bert && (bert.status === 'loading' || bert.status === 'training')
  return (
    <Tip text={busy ? 'TF-IDF model live. BERT engine is preparing in the background.' : 'Connected to the trained machine-learning backend.'}>
      <span className="chip border-safe/40 bg-safe/10 text-safe"><span className="relative h-1.5 w-1.5 rounded-[1px] bg-safe"><span className="absolute inset-0 animate-pulse-ring rounded-[1px] bg-safe" /></span>Model live</span>
    </Tip>
  )
}
