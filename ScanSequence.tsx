import { motion } from 'framer-motion'
import { CircleCheck, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

export const STAGES = [
  'Initializing AI engine',
  'Examining email content',
  'Identifying suspicious language',
  'Extracting URLs',
  'Evaluating threat indicators',
  'Generating analysis report',
]

/** Advances through stages on a timer; holds on the last stage until `done` is true. */
export function ScanSequence({ done, onFinished, demo }: { done: boolean; onFinished: () => void; demo: boolean }) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    if (stage < STAGES.length - 1) { const t = setTimeout(() => setStage(s => s + 1), 380); return () => clearTimeout(t) }
    if (done) { const t = setTimeout(onFinished, 420); return () => clearTimeout(t) }
  }, [stage, done, onFinished])
  const pct = ((stage + (done && stage === STAGES.length - 1 ? 1 : 0.5)) / STAGES.length) * 100

  return (
    <div className="panel relative overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan bg-gradient-to-b from-transparent via-cyan/10 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow">{demo ? 'Demo mode · browser heuristic' : 'Live analysis'}</div>
            <div className="h-display mt-2 text-xl font-medium">Investigating email…</div>
          </div>
          <div className="relative grid h-14 w-14 place-items-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan/50" />
            <span className="absolute inset-2 animate-spin-slow rounded-full border border-dashed border-violet/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_16px_#00E5FF]" />
          </div>
        </div>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.4 }} />
        </div>
        <ol className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {STAGES.map((s, i) => {
            const state = i < stage || (done && i === stage && stage === STAGES.length - 1) ? 'done' : i === stage ? 'active' : 'todo'
            return (
              <motion.li key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: state === 'todo' ? 0.35 : 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 px-3.5 py-2.5 text-sm">
                {state === 'done' ? <CircleCheck size={16} className="text-safe" /> : state === 'active' ? <LoaderCircle size={16} className="animate-spin text-cyan" /> : <span className="h-4 w-4 rounded-full border border-line-strong" />}
                <span className={state === 'active' ? 'text-fg' : 'text-dim'}>{s}</span>
                <span className="ml-auto font-mono text-[10px] text-faint">0{i + 1}</span>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
