import { motion } from 'framer-motion'
import { useEffect, useId, useRef, type ReactNode } from 'react'

/* ── Particle wave: a scattered sine band, density/height driven by `intensity` (0-100) ── */
export function ParticleWave({ intensity, from = '#5b5bf6', to = '#60a5fa', height = 120 }: { intensity: number; from?: string; to?: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, raf = 0, t = 0
    const N = 900
    const seeds = Array.from({ length: N }, () => ({ u: Math.random(), o: (Math.random() + Math.random() + Math.random() - 1.5) / 1.5, s: Math.random() }))
    const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
    const A = hex(from), B = hex(to)
    const resize = () => {
      w = c.parentElement?.clientWidth ?? 300
      c.width = w * dpr; c.height = height * dpr
      c.style.width = `${w}px`; c.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const amp = 0.18 + (intensity / 100) * 0.3
    const draw = () => {
      t += 0.012
      ctx.clearRect(0, 0, w, height)
      for (const p of seeds) {
        const x = p.u * w
        const yc = height * 0.55 - Math.sin(p.u * Math.PI * 2.2 + t) * height * amp * (0.6 + p.u * 0.6)
        const spread = height * (0.08 + 0.12 * Math.abs(Math.cos(p.u * 5 + t * 0.7)))
        const y = yc + p.o * spread
        const k = p.u
        const r = A[0] + (B[0] - A[0]) * k, g = A[1] + (B[1] - A[1]) * k, b = A[2] + (B[2] - A[2]) * k
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${0.35 + p.s * 0.55})`
        const s = 0.8 + p.s * 1.4
        ctx.fillRect(x, y, s, s)
      }
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    draw()
    const ro = new ResizeObserver(resize); if (c.parentElement) ro.observe(c.parentElement)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [intensity, from, to, height])
  return <canvas ref={ref} className="block" aria-hidden />
}

/* ── Dot matrix: `filled` of `rows*cols` dots lit, left to right ── */
export function DotMatrix({ filled, total = 96, cols = 16, color = '#8b8dff' }: { filled: number; total?: number; cols?: number; color?: string }) {
  return (
    <div className="grid gap-[7px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: total }).map((_, i) => {
        const col = i % cols, row = Math.floor(i / cols)
        const order = col * (total / cols) + row
        const lit = order < filled
        return <motion.span key={i} className="mx-auto h-[6px] w-[6px] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1, backgroundColor: lit ? color : 'rgba(255,255,255,0.14)' }} transition={{ delay: 0.15 + order * 0.006 }} style={{ boxShadow: lit ? `0 0 8px ${color}` : undefined }} />
      })}
    </div>
  )
}

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`
  }
  return d
}

/* ── Smooth area spark ── */
export function AreaSpark({ values, color = '#34d399', height = 90 }: { values: number[]; color?: string; height?: number }) {
  const id = useId()
  const v = values.length >= 2 ? values : [values[0] ?? 0, values[0] ?? 0]
  const max = Math.max(1, ...v), W = 300
  const pts = v.map((y, i) => [(i / (v.length - 1)) * W, height - 8 - (y / max) * (height - 24)] as [number, number])
  const line = smoothPath(pts)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.55" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <motion.path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ── Line with dots ── */
export function LineDots({ values, color = '#8b8dff', height = 90 }: { values: number[]; color?: string; height?: number }) {
  const v = values.length >= 2 ? values : [0, ...(values.length ? values : [0]), 0]
  const max = Math.max(1, ...v), W = 300
  const pts = v.map((y, i) => [12 + (i / (v.length - 1)) * (W - 24), height - 12 - (y / max) * (height - 30)] as [number, number])
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="block h-full w-full overflow-visible" aria-hidden>
      <motion.polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      {pts.map(([x, y], i) => <motion.circle key={i} cx={x} cy={y} r="3.5" fill="#0d1430" stroke={color} strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.06 }} />)}
    </svg>
  )
}

/* ── Donut with gaps ── */
export function Donut({ data, size = 220, thickness = 34, center }: { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const r = (size - thickness) / 2, C = 2 * Math.PI * r
  const gap = data.filter(d => d.value).length > 1 ? 6 : 0
  let acc = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
        {data.filter(d => d.value).map((d, i) => {
          const len = (d.value / total) * C, off = acc
          acc += len
          return <motion.circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${Math.max(0, len - gap)} ${C}`} initial={{ strokeDashoffset: -off + len, opacity: 0 }} animate={{ strokeDashoffset: -off, opacity: 1 }} transition={{ duration: 0.9, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }} />
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  )
}

/* ── Funnel: smooth tapering band through stage values, indigo → mint ── */
export function Funnel({ stages, height = 190 }: { stages: { label: string; value: number }[]; height?: number }) {
  const id = useId()
  const W = 1000, n = stages.length, max = Math.max(1, stages[0]?.value ?? 1)
  const xs = stages.map((_, i) => (i / (n - 1 || 1)) * W * 0.86 + W * 0.07)
  const half = stages.map(s => Math.max(4, Math.sqrt(s.value / max) * height * 0.42))
  const mid = height / 2
  const top: [number, number][] = [[0, mid - half[0] * 1.08], ...xs.map((x, i) => [x, mid - half[i]] as [number, number]), [W, mid - Math.max(2, half[n - 1] * 0.25)]]
  const bot = top.map(([x, y]) => [x, mid + (mid - y)] as [number, number]).reverse()
  const d = `${smoothPath(top)} L${bot[0][0]},${bot[0][1]} ${smoothPath(bot).slice(1)} Z`
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="#4f46e5" /><stop offset="0.55" stopColor="#6d8cf7" /><stop offset="0.8" stopColor="#5eead4" /><stop offset="1" stopColor="#5eead4" stopOpacity="0.1" /></linearGradient>
        </defs>
        <motion.path d={d} fill={`url(#${id})`} initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 0.95, scaleX: 1 }} style={{ originX: 0 }} transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }} />
        {xs.map((x, i) => <line key={i} x1={x} x2={x} y1={0} y2={height} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />)}
      </svg>
    </div>
  )
}

/* ── Bubble cluster sized by value ── */
export function Bubbles({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1
  const live = items.filter(i => i.value)
  const sorted = [...live].sort((a, b) => b.value - a.value)
  // Fixed layout slots (percent of box), biggest first
  const slots = [{ x: 30, y: 52 }, { x: 68, y: 34 }, { x: 62, y: 78 }, { x: 86, y: 64 }]
  return (
    <div className="relative h-[220px] w-full">
      {sorted.map((b, i) => {
        const pct = (b.value / total) * 100
        const d = 70 + Math.sqrt(pct / 100) * 110
        const s = slots[i] ?? slots[slots.length - 1]
        return (
          <motion.div key={b.label} className="absolute grid place-items-center rounded-full text-center"
            style={{ width: d, height: d, left: `calc(${s.x}% - ${d / 2}px)`, top: `calc(${s.y}% - ${d / 2}px)`, background: `radial-gradient(circle at 35% 30%, ${b.color}, ${b.color}cc 60%, ${b.color}99)`, boxShadow: `0 10px 40px -10px ${b.color}` }}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.2 + i * 0.1 }}>
            <div className="px-2">
              <div className="font-display text-[22px] leading-none font-semibold text-white">{Math.round(pct)}%</div>
              <div className="mt-1 text-[11.5px] leading-tight text-white/85">{b.label}</div>
            </div>
          </motion.div>
        )
      })}
      {!live.length && <div className="grid h-full place-items-center text-sm text-dim">No signals to break down.</div>}
    </div>
  )
}
