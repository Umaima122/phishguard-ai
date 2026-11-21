import { motion } from 'framer-motion'
import { Activity, ArrowRight, Brain, Inbox, Link2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Counter, DemoBadge, EmptyState, SectionHeader, levelStyle } from '../components/ui'
import { demoHistory, demoStats } from '../data/demoData'
import { api } from '../lib/api'
import { useApp } from '../lib/store'
import type { EngineInfo, HistoryItem, Stats, ThreatLevel } from '../lib/types'

// Phishing / legitimate pair validated for colour-blind separation on the dark surface
const C_PHISH = '#f87171', C_LEGIT = '#60a5fa'
const LEVELS: ThreatLevel[] = ['Critical', 'High', 'Medium', 'Low']
const axis = { stroke: '#64748b', fontSize: 11, tickLine: false, axisLine: false }

function TipBox({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string; payload?: { fill?: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[2px] border border-line bg-deep/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label && <div className="mb-1 font-mono text-faint">{label}</div>}
      {payload.map(p => <div key={p.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-[2px]" style={{ background: p.color ?? p.payload?.fill }} /><span className="text-dim">{p.name}</span><span className="ml-auto pl-3 font-mono text-fg">{p.value}</span></div>)}
    </div>
  )
}

function Panel({ title, right, children, className = '' }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className={`panel p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-display text-[15px] font-medium">{title}</h3>{right}</div>
      {children}
    </motion.div>
  )
}

function Legend() {
  return <div className="flex gap-4 text-xs text-dim">{[['Phishing', C_PHISH], ['Legitimate', C_LEGIT]].map(([n, c]) => <span key={n} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: c }} />{n}</span>)}</div>
}

function ModelCard({ e }: { e: EngineInfo }) {
  const m = e.metrics
  if (!m) return (
    <div className="min-w-0 rounded-[3px] border border-line bg-ink/40 p-5">
      <div className="text-sm font-medium">{e.name}</div>
      <div className="mt-2 text-sm text-dim">Status: <span className="text-warn">{e.status}</span>{e.status === 'training' && ' It is trained during deployment.'}{e.error && e.status !== 'training' && <span className="block text-xs text-faint">{e.error}</span>}</div>
    </div>
  )
  const cm = m.confusion_matrix, max = Math.max(...cm.flat())
  return (
    <div className="min-w-0 rounded-[3px] border border-line bg-ink/40 p-5">
      <div className="flex items-center justify-between gap-2"><div className="text-sm font-medium">{e.name}</div><span className="chip border-safe/40 bg-safe/10 text-safe">{e.status}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {([['Accuracy', m.accuracy], ['Precision', m.precision], ['Recall', m.recall], ['F1', m.f1], ['ROC-AUC', m.roc_auc]] as const).map(([k, v]) => (
          <div key={k}><div className="font-mono text-[10px] text-faint">{k}</div><div className="font-display text-xl font-semibold tabular-nums">{(v * 100).toFixed(1)}<span className="text-sm text-dim">%</span></div></div>
        ))}
      </div>
      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <div>
          <div className="mb-2 font-mono text-[10px] text-faint">Confusion matrix · test set</div>
          <div className="grid grid-cols-[auto_repeat(2,72px)] gap-1 text-center text-xs">
            <span /><span className="text-faint">Pred. safe</span><span className="text-faint">Pred. phish</span>
            {cm.map((row, i) => [<span key={`l${i}`} className="self-center pr-2 text-right text-faint">{i ? 'Phish' : 'Safe'}</span>,
              ...row.map((v, j) => <div key={`${i}${j}`} title={`${i ? 'Actual phishing' : 'Actual safe'} → ${j ? 'predicted phishing' : 'predicted safe'}: ${v}`} className="grid h-14 place-items-center rounded-[2px] font-mono text-sm text-fg" style={{ background: i === j ? `rgb(0 229 255 / ${0.1 + 0.4 * v / max})` : `rgb(248 113 113 / ${0.12 + 0.5 * v / max})` }}>{v.toLocaleString()}</div>)])}
          </div>
        </div>
        <div className="space-y-1.5 text-[13px] text-dim">
          <div><span className="text-fg">{m.false_positives}</span> safe emails wrongly flagged (false positives)</div>
          <div><span className="text-fg">{m.false_negatives}</span> phishing emails missed (false negatives)</div>
          <div className="pt-2 text-xs text-faint">Trained on {m.train_size.toLocaleString()} · tested on {m.test_size.toLocaleString()} held-out emails from {m.dataset.file}. {m.dataset.duplicates_removed.toLocaleString()} duplicates removed before splitting to avoid leakage.</div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { backend, health } = useApp()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const demo = backend === 'offline'

  useEffect(() => {
    if (backend === 'checking') return
    if (demo) { setStats(demoStats); setRecent(demoHistory.slice(0, 6)); setLoading(false); return }
    Promise.all([api.stats(), api.history()]).then(([s, h]) => { setStats(s); setRecent(h.slice(0, 6)) }).catch(() => { setStats(demoStats); setRecent(demoHistory) }).finally(() => setLoading(false))
  }, [backend, demo])

  const s = stats
  const pie = s ? [{ name: 'Phishing', value: s.phishing, fill: C_PHISH }, { name: 'Legitimate', value: s.legitimate, fill: C_LEGIT }] : []
  const levels = s ? LEVELS.map(l => ({ name: l, value: s.by_level[l] ?? 0, fill: levelStyle[l].hex })) : []
  const daily = s?.daily.map(d => ({ ...d, day: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })) ?? []

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 lg:px-8">
      <SectionHeader eyebrow="Threat Intelligence" title="Security operations dashboard" sub="Activity from saved analyses and the measured performance of each model."
        right={demo ? <DemoBadge /> : <span className="chip border-cyan/30 bg-cyan/10 text-cyan"><Activity size={12} />Live data</span>} />

      {loading || !s ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className={`skeleton ${i < 4 ? 'h-28' : 'h-64 lg:col-span-2'}`} />)}</div>
      ) : (<>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ l: 'Total analyses', v: s.total, i: Inbox }, { l: 'Phishing detections', v: s.phishing, i: ShieldAlert }, { l: 'Legitimate emails', v: s.legitimate, i: ShieldCheck }, { l: 'URLs inspected', v: s.urls_inspected, i: Link2 }].map(k => (
            <div key={k.l} className="panel panel-hover ticks p-5">
              <div className="flex items-center justify-between text-[13px] text-dim">{k.l}<k.i size={16} className="text-faint" /></div>
              <div className="h-display mt-3 text-3xl font-semibold tabular-nums"><Counter value={k.v} /></div>
            </div>
          ))}
        </div>

        {s.total === 0 ? (
          <div className="panel mt-5"><EmptyState icon={<Activity size={22} />} title="No saved analyses yet" body="Run an analysis with “Save result to history” switched on and the charts will fill in here." action={<Link to="/analyze" className="btn btn-primary">Analyze an email</Link>} /></div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Panel title="Detection distribution" right={<Legend />}>
              <div className="relative h-56">
                <ResponsiveContainer><PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="88%" paddingAngle={2} stroke="#111b2d" strokeWidth={2} cornerRadius={1}>{pie.map(p => <Cell key={p.name} fill={p.fill} />)}</Pie>
                  <Tooltip content={<TipBox />} />
                </PieChart></ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-3xl font-semibold">{s.total ? Math.round(s.phishing / s.total * 100) : 0}%</div><div className="text-xs text-faint">phishing rate</div>
                </div>
              </div>
            </Panel>
            <Panel title="Analysis activity · last 14 days" right={<Legend />} className="lg:col-span-2">
              <div className="h-56">
                <ResponsiveContainer><BarChart data={daily} barCategoryGap="28%" maxBarSize={40}>
                  <CartesianGrid vertical={false} stroke="rgb(148 163 194 / 0.08)" />
                  <XAxis dataKey="day" {...axis} interval="preserveStartEnd" /><YAxis {...axis} allowDecimals={false} width={28} />
                  <Tooltip content={<TipBox />} cursor={{ fill: 'rgb(148 163 194 / 0.06)' }} />
                  <Bar dataKey="phishing" name="Phishing" stackId="a" fill={C_PHISH} stroke="#111b2d" strokeWidth={1} />
                  <Bar dataKey="legitimate" name="Legitimate" stackId="a" fill={C_LEGIT} radius={[1, 1, 0, 0]} stroke="#111b2d" strokeWidth={1} />
                </BarChart></ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Threat classification">
              <div className="h-56">
                <ResponsiveContainer><BarChart data={levels} layout="vertical" barCategoryGap="30%">
                  <XAxis type="number" {...axis} allowDecimals={false} /><YAxis type="category" dataKey="name" {...axis} width={62} />
                  <Tooltip content={<TipBox />} cursor={{ fill: 'rgb(148 163 194 / 0.06)' }} />
                  <Bar dataKey="value" name="Analyses" radius={[0, 1, 1, 0]}>{levels.map(l => <Cell key={l.name} fill={l.fill} />)}</Bar>
                </BarChart></ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Most common warning signs" className="lg:col-span-2">
              <ul className="space-y-3">
                {s.top_warnings.map(w => (
                  <li key={w.title} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
                    <span className="truncate text-dim">{w.title}</span><span className="font-mono text-xs text-fg">{w.count}</span>
                    <div className="col-span-2 h-1.5 rounded-[1px] bg-white/[0.05]"><motion.div className="h-full rounded-[1px] bg-cyan" initial={{ width: 0 }} whileInView={{ width: `${(w.count / s.top_warnings[0].count) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} /></div>
                  </li>
                ))}
                {!s.top_warnings.length && <li className="text-sm text-dim">No warnings recorded yet.</li>}
              </ul>
            </Panel>
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Panel title="Model intelligence" right={<Brain size={16} className="text-faint" />}>
            {demo ? <p className="text-sm text-dim">Model metrics appear here when the backend is connected. No performance figures are shown in demo mode.</p> : (
              <div className="space-y-4">{health?.engines.map(e => <ModelCard key={e.key} e={e} />)}</div>
            )}
          </Panel>
          <Panel title="Recent activity" right={<Link to="/history" className="inline-flex items-center gap-1 text-xs text-cyan hover:underline">All history<ArrowRight size={12} /></Link>}>
            {recent.length === 0 ? <p className="text-sm text-dim">Nothing saved yet.</p> : (
              <ul className="divide-y divide-line">
                {recent.map(h => (
                  <li key={h.id} className="flex items-center gap-3 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-[1px]`} style={{ background: h.classification === 'Potential Phishing' ? C_PHISH : C_LEGIT }} />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm">{h.subject || '(no subject)'}</div><div className="truncate font-mono text-[11px] text-faint">{h.sender || 'no sender'} · {new Date(h.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</div></div>
                    <span className={`font-mono text-xs ${levelStyle[h.threat_level].text}`}>{h.score.toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </>)}
    </div>
  )
}
