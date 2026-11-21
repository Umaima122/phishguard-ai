import { animate, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function scoreColor(score: number) {
  return score >= 85 ? '#ef4444' : score >= 65 ? '#f87171' : score >= 40 ? '#f59e0b' : '#10b981'
}

export function ScoreRing({ score, size = 190, label = 'Model score' }: { score: number; size?: number; label?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => { const c = animate(0, score, { duration: 1.3, ease: [0.16, 1, 0.3, 1], onUpdate: setV }); return () => c.stop() }, [score])
  const stroke = 10, r = (size - stroke) / 2 - 8, C = 2 * Math.PI * r
  const color = scoreColor(score)
  const ticks = Array.from({ length: 60 })
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * 2 * Math.PI, R1 = size / 2 - 2, R2 = R1 - (i % 5 === 0 ? 6 : 3)
          return <line key={i} x1={size / 2 + R1 * Math.cos(a)} y1={size / 2 + R1 * Math.sin(a)} x2={size / 2 + R2 * Math.cos(a)} y2={size / 2 + R2 * Math.sin(a)}
            stroke={i / ticks.length * 100 <= v ? color : 'rgb(148 163 194 / 0.18)'} strokeWidth="1.2" opacity={i / ticks.length * 100 <= v ? 0.7 : 1} />
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(148 163 194 / 0.10)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }} filter="url(#glow)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-semibold tabular-nums" style={{ color }}>{v.toFixed(0)}</div>
        <div className="mt-1 font-mono text-[10px] text-faint">{label} / 100</div>
      </div>
    </div>
  )
}
