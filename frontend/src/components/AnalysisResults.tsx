import { AnimatePresence, motion } from 'framer-motion'
import { AtSign, Brain, ChevronDown, CircleCheck, Copy, Download, Link2, ListChecks, RotateCcw, Scale, ShieldAlert, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { downloadReport } from '../lib/report'
import { useApp } from '../lib/store'
import type { AnalysisResult, Indicator, UrlReport } from '../lib/types'
import { ScoreRing, scoreColor } from './ScoreRing'
import { DemoBadge, SevBadge, Tip, levelStyle } from './ui'

const fade = { hidden: { opacity: 0, y: 14 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } }) }

function Card({ i, icon, title, count, children, className = '' }: { i: number; icon: ReactNode; title: string; count?: number; children: ReactNode; className?: string }) {
  return (
    <motion.section custom={i} variants={fade} initial="hidden" animate="show" className={`panel p-5 md:p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[2px] border border-line bg-white/[0.03] text-cyan">{icon}</span>
        <h3 className="font-display text-[15px] font-medium">{title}</h3>
        {count !== undefined && <span className="ml-auto font-mono text-xs text-faint">{count}</span>}
      </div>
      {children}
    </motion.section>
  )
}

function Expandable({ head, children, defaultOpen = false, edge }: { head: ReactNode; children: ReactNode; defaultOpen?: boolean; edge?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="group relative border-b border-line last:border-b-0">
      <span className="absolute top-3 bottom-3 left-0 w-[2px] transition-opacity" style={{ background: edge ?? 'transparent', opacity: open ? 1 : 0.55 }} />
      <button className="flex w-full items-center gap-3 py-3.5 pr-1 pl-4 text-left transition-colors hover:bg-white/[0.025]" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="min-w-0 flex-1">{head}</div>
        <ChevronDown size={15} className={`shrink-0 text-faint transition-transform duration-200 ${open ? 'rotate-180 text-dim' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
          <div className="pr-4 pb-4 pl-4 text-sm text-dim">{children}</div>
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}

const SEV_HEX = { high: '#f87171', medium: '#f59e0b', low: '#64748b' } as const

function SeverityBar({ items }: { items: { severity: 'high' | 'medium' | 'low' }[] }) {
  const counts = (['high', 'medium', 'low'] as const).map(k => ({ k, n: items.filter(i => i.severity === k).length }))
  const total = items.length || 1
  return (
    <div className="mb-3">
      <div className="flex h-[3px] w-full gap-[2px] overflow-hidden">
        {counts.filter(c => c.n).map(c => (
          <motion.span key={c.k} className="h-full" style={{ background: SEV_HEX[c.k] }} initial={{ width: 0 }} animate={{ width: `${(c.n / total) * 100}%` }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
        ))}
      </div>
      <div className="mt-2.5 flex gap-5 text-[12.5px]">
        {counts.map(c => (
          <span key={c.k} className={c.n ? 'text-dim' : 'text-faint/60'}><span className="font-mono text-fg" style={{ color: c.n ? SEV_HEX[c.k] : undefined }}>{c.n}</span> {c.k}</span>
        ))}
      </div>
    </div>
  )
}

function IndicatorList({ items }: { items: Indicator[] }) {
  if (!items.length) return <p className="text-sm text-dim">No static warning signs found.</p>
  return (
    <ul className="space-y-2">
      {items.map(i => (
        <li key={i.label} className="flex gap-3"><SevBadge s={i.severity} /><div><div className="text-fg">{i.label}</div><div className="text-[13px] text-dim">{i.detail}</div></div></li>
      ))}
    </ul>
  )
}

function UrlRow({ u }: { u: UrlReport }) {
  const { toast } = useApp()
  return (
    <Expandable edge={SEV_HEX[u.risk]} defaultOpen={u.risk === 'high'} head={
      <div className="flex items-center gap-3">
        <SevBadge s={u.risk} />
        <span className="min-w-0 truncate font-mono text-[12.5px] text-fg" title={u.url}>{u.url}</span>
      </div>}>
      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[11px] text-faint">
        <span>host: <span className="text-dim">{u.host || '—'}</span></span><span>·</span><span>scheme: <span className="text-dim">{u.scheme || '—'}</span></span>
        <button className="ml-auto inline-flex items-center gap-1 text-dim hover:text-cyan" onClick={() => { void navigator.clipboard?.writeText(u.url); toast({ kind: 'info', title: 'URL copied as text', body: 'Paste it into the URL Inspector, never straight into a browser.' }) }}>
          <Copy size={12} />Copy
        </button>
      </div>
      <IndicatorList items={u.indicators} />
    </Expandable>
  )
}

export function AnalysisResults({ r, meta, onReset }: { r: AnalysisResult; meta: { subject: string; sender: string }; onReset: () => void }) {
  const { toast } = useApp()
  const phish = r.classification === 'Potential Phishing'
  const lvl = levelStyle[r.threat_level]
  const up = r.top_terms.filter(t => t.weight > 0)
  const down = r.top_terms.filter(t => t.weight < 0)
  const maxW = Math.max(0.0001, ...r.top_terms.map(t => Math.abs(t.weight)))

  const copySummary = () => {
    const s = `PhishGuard AI: ${r.classification} (score ${r.score.toFixed(1)}/100, ${r.threat_level})${r.source === 'demo' ? ' [DEMO]' : ''}\n${r.explanation}`
    void navigator.clipboard?.writeText(s)
    toast({ kind: 'success', title: 'Summary copied' })
  }

  return (
    <div className="space-y-5">
      {/* Verdict */}
      <motion.section custom={0} variants={fade} initial="hidden" animate="show" className="panel ticks relative p-6 md:p-8">
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center">
          <ScoreRing score={r.score} />
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {r.source === 'demo' ? <DemoBadge label="Demo assessment" /> : <span className="chip border-cyan/30 bg-cyan/10 text-cyan"><Brain size={12} />{r.engine.name}</span>}
              <span className={`chip ${lvl.chip}`}>{r.threat_level} threat</span>
              {r.saved && <span className="chip border-line text-dim">Saved to history</span>}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3 md:justify-start">
              {phish ? <ShieldAlert className="text-danger" size={30} /> : <ShieldCheck className="text-safe" size={30} />}
              <h2 className={`h-display text-3xl font-semibold md:text-4xl ${phish ? 'text-danger' : 'text-safe'}`}>{r.classification}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-dim">
              <Tip text="Logistic Regression's estimated phishing likelihood on a 0–100 scale. 50 is the decision threshold. It is not a guaranteed probability."><span className="cursor-help border-b border-dashed border-faint">Model score</span></Tip>{' '}
              {r.score.toFixed(1)}/100. This is a model estimate, not a guaranteed probability, so always apply your own judgement.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              <button className="btn btn-ghost" onClick={() => { downloadReport(r, meta); toast({ kind: 'success', title: 'Report downloaded', body: 'Open it in a browser and print to PDF if needed.' }) }}><Download size={16} />Download report</button>
              <button className="btn btn-ghost" onClick={copySummary}><Copy size={16} />Copy summary</button>
              <button className="btn btn-quiet" onClick={onReset}><RotateCcw size={16} />New analysis</button>
            </div>
          </div>
        </div>
      </motion.section>

      {r.comparison.length > 0 && (
        <Card i={1} icon={<Scale size={16} />} title="Model comparison">
          <div className="grid gap-4 sm:grid-cols-2">
            {r.comparison.map(c => (
              <div key={c.engine} className="rounded-[3px] border border-line bg-ink/40 p-4">
                <div className="text-sm text-dim">{c.name}</div>
                {c.score == null ? <div className="mt-2 text-sm text-warn">Engine {c.status}. Try again shortly.</div> : (<>
                  <div className="mt-1 flex items-baseline justify-between"><span className="font-display text-2xl font-semibold" style={{ color: scoreColor(c.score) }}>{c.score.toFixed(1)}</span><span className="text-xs text-dim">{c.classification}</span></div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-[1px] bg-white/[0.06]"><motion.div className="h-full rounded-[1px]" style={{ background: scoreColor(c.score) }} initial={{ width: 0 }} animate={{ width: `${c.score}%` }} transition={{ duration: 1 }} /></div>
                </>)}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">TF-IDF reads word patterns; Sentence-BERT reads meaning. When they disagree, treat the email as uncertain.</p>
        </Card>
      )}

      <div className="@container"><div className="grid gap-5 @3xl:grid-cols-2">
        <Card i={2} icon={<Sparkles size={16} />} title="AI explanation" className="@3xl:col-span-2">
          <p className="text-[15px] leading-relaxed text-fg/90">{r.explanation}</p>
          {(up.length > 0 || down.length > 0) && (
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {[{ t: 'Pushed toward phishing', items: up, c: 'bg-danger' }, { t: 'Pushed toward legitimate', items: down, c: 'bg-safe' }].map(g => g.items.length > 0 && (
                <div key={g.t}>
                  <div className="mb-2 font-mono text-[11px] text-faint">{g.t}</div>
                  <ul className="space-y-1.5">
                    {g.items.map(t => (
                      <li key={t.term} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-[13px]">
                        <span className="truncate font-mono text-dim">{t.term}</span>
                        <div className="h-1.5 rounded-[1px] bg-white/[0.05]"><motion.div className={`h-full rounded-[1px] ${g.c}`} initial={{ width: 0 }} animate={{ width: `${(Math.abs(t.weight) / maxW) * 100}%` }} transition={{ duration: 0.8 }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card i={3} icon={<TriangleAlert size={16} />} title="Warning indicators" count={r.warnings.length}>
          {r.warnings.length === 0 ? <div className="flex items-center gap-2 text-sm text-dim"><CircleCheck size={16} className="text-safe" />No rule-based warning signs detected.</div> : (
            <div>
              <SeverityBar items={r.warnings} />
              <div className="border-t border-line">
                {r.warnings.map((w, n) => (
                  <motion.div key={w.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + n * 0.05 }}>
                    <Expandable edge={SEV_HEX[w.severity]} head={
                      <div className="flex items-baseline gap-3">
                        <span className="min-w-0 flex-1 text-[14px] text-fg">{w.title}</span>
                        <span className="hidden text-[12px] text-faint sm:inline">{w.category}</span>
                      </div>}>
                      <div className="mb-2 text-[12px] text-faint">Found in the email</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {w.evidence.map(e => (
                          <span key={e} className="font-mono text-[12.5px] text-fg/90 underline decoration-2 underline-offset-4" style={{ textDecorationColor: SEV_HEX[w.severity] + 'aa' }}>{e}</span>
                        ))}
                      </div>
                    </Expandable>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card i={4} icon={<Link2 size={16} />} title="Extracted URLs" count={r.urls.length}>
          {r.urls.length === 0 ? <p className="text-sm text-dim">No URLs detected in this email.</p> : (
            <div className="border-t border-line">{r.urls.map(u => <UrlRow key={u.url} u={u} />)}</div>
          )}
          <p className="mt-3 text-xs text-faint">Static checks only. Links are shown as text and never opened. HTTPS or a clean result doesn't prove a site is safe.</p>
        </Card>

        <Card i={5} icon={<AtSign size={16} />} title="Sender analysis">
          {!r.sender ? <p className="text-sm text-dim">No sender provided. Add the sender address for impersonation checks.</p> : (<>
            <div className="mb-4 rounded-[3px] border border-line bg-ink/40 px-4 py-3 font-mono text-[13px]">
              {r.sender.display_name && <span className="text-dim">{r.sender.display_name} </span>}<span className="text-fg">&lt;{r.sender.address}&gt;</span>
            </div>
            <IndicatorList items={r.sender.indicators} />
          </>)}
        </Card>

        <Card i={6} icon={<ListChecks size={16} />} title="Recommended actions">
          <ol className="space-y-2.5">
            {r.recommendations.map((rec, i) => (
              <li key={rec} className="flex gap-3 text-sm"><span className="mt-0.5 font-mono text-xs text-cyan">0{i + 1}</span><span className="text-fg/90">{rec}</span></li>
            ))}
          </ol>
        </Card>
      </div></div>
    </div>
  )
}
