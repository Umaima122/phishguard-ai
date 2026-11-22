import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown, Copy, Download, RotateCcw, Sparkles } from 'lucide-react'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { downloadReport } from '../lib/report'
import { useApp } from '../lib/store'
import type { AnalysisResult, Severity } from '../lib/types'
import { AreaSpark, Bubbles, Donut, DotMatrix, Funnel, LineDots, ParticleWave } from './dash'
import { Tip } from './ui'

const SEV = { high: '#fb7185', medium: '#fbbf24', low: '#8b93b8' } as const
const LEVEL = { Critical: '#f43f5e', High: '#fb7185', Medium: '#fbbf24', Low: '#34d399' } as const
const CAT = { Language: '#5b5bf6', Request: '#8b8dff', Attachment: '#60a5fa', Links: '#5eead4', Sender: '#a78bfa' } as const

const rise = { hidden: { opacity: 0, y: 14 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const } }) }

function Card({ i, title, right, children, className = '', bodyClass = '' }: { i: number; title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <motion.section custom={i} variants={rise} initial="hidden" animate="show" className={`panel relative overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-6 pt-5">
          <h3 className="font-display text-[17px] font-medium tracking-tight">{title}</h3>
          {right}
        </div>
      )}
      <div className={bodyClass || 'px-6 pt-4 pb-6'}>{children}</div>
    </motion.section>
  )
}

function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[12px] font-medium" style={{ color, borderColor: color + '55', background: color + '14' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />{children}
    </span>
  )
}

function SevBox({ s }: { s: Severity }) {
  return <span className="inline-flex min-w-[64px] justify-center rounded-md px-2 py-1 text-[12px] font-semibold capitalize" style={{ color: SEV[s], background: SEV[s] + '1f' }}>{s}</span>
}

export function AnalysisResults({ r, meta, onReset }: { r: AnalysisResult; meta: { subject: string; sender: string; body?: string }; onReset: () => void }) {
  const { toast } = useApp()
  const [openUrl, setOpenUrl] = useState<string | null>(null)
  const [openWarn, setOpenWarn] = useState<string | null>(r.warnings[0]?.id ?? null)
  const phish = r.classification === 'Potential Phishing'
  const verdictColor = phish ? '#fb7185' : '#34d399'
  const levelColor = LEVEL[r.threat_level]

  const d = useMemo(() => {
    const sevCount = { high: 0, medium: 0, low: 0 }
    r.warnings.forEach(w => sevCount[w.severity]++)
    r.urls.forEach(u => sevCount[u.risk]++)
    r.sender?.indicators.forEach(i => sevCount[i.severity]++)
    const cats: Record<string, number> = { Language: 0, Request: 0, Attachment: 0, Links: 0, Sender: 0 }
    r.warnings.forEach(w => { cats[w.category in cats ? w.category : 'Language']++ })
    cats.Links = r.urls.reduce((a, u) => a + u.indicators.length, 0)
    cats.Sender = r.sender?.indicators.length ?? 0
    const signals = Object.values(cats).reduce((a, b) => a + b, 0)
    const words = meta.body ? meta.body.trim().split(/\s+/).filter(Boolean).length + (meta.subject ? meta.subject.split(/\s+/).length : 0) : 0
    const up = r.top_terms.filter(t => t.weight > 0)
    const highSev = sevCount.high
    return { sevCount, cats, signals, words, up, highSev }
  }, [r, meta.body, meta.subject])

  const copy = () => {
    void navigator.clipboard?.writeText(`PhishGuard AI: ${r.classification} (score ${r.score.toFixed(1)}/100, ${r.threat_level})${r.source === 'demo' ? ' [DEMO]' : ''}\n${r.explanation}`)
    toast({ kind: 'success', title: 'Summary copied' })
  }

  // Stages always narrow: middle stages sorted by size, high-severity last
  const middle = [
    { label: 'Weighted terms', value: d.up.length || r.top_terms.length },
    { label: 'Signals raised', value: d.signals },
  ].sort((a, b) => b.value - a.value)
  const first = Math.max(d.words || 0, middle[0].value, 1)
  const funnel = [{ label: 'Words analysed', value: first }, ...middle, { label: 'High severity', value: Math.min(d.highSev, middle[1].value || d.highSev) }]
  const maxW = Math.max(0.0001, ...d.up.map(t => t.weight))
  const steps = ['Now', 'Before replying', 'Before acting', 'Always', 'Today']

  return (
    <div className="@container space-y-5">
      {r.source === 'demo' && (
        <div className="rounded-xl border border-warn/30 bg-warn/[0.07] px-4 py-3 text-[13px] text-warn">Demo assessment. The backend is offline, so this is a browser heuristic, not the trained model.</div>
      )}

      {/* Header */}
      <motion.div custom={0} variants={rise} initial="hidden" animate="show" className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
        <div>
          <div className="text-[13px] text-dim">Analysis report · <span className="font-mono text-[12px]">{new Date(r.timestamp).toLocaleTimeString()}</span></div>
          <h2 className="mt-1 font-display text-[34px] leading-tight font-semibold tracking-tight" style={{ color: verdictColor }}>{phish ? 'Potential Phishing' : 'Likely Legitimate'}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill color={levelColor}>{r.threat_level} threat</Pill>
            <Pill color="#8b8dff">{r.engine.name}</Pill>
            {r.saved && <Pill color="#5eead4">Saved to history</Pill>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={copy}><Copy size={15} />Copy</button>
          <button className="btn btn-ghost" onClick={onReset}><RotateCcw size={15} />New analysis</button>
          <button className="btn btn-primary" onClick={() => { downloadReport(r, meta); toast({ kind: 'success', title: 'Report downloaded' }) }}><Download size={15} />Download report</button>
        </div>
      </motion.div>

      {/* KPI row */}
      <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
        <Card i={1} bodyClass="pt-5">
          <div className="px-6">
            <div className="flex items-center justify-between"><span className="font-display text-[16px] font-medium">Threat score</span>
              <Tip text="Model estimate on a 0 to 100 scale. 50 is the decision threshold. Not a guaranteed probability."><span className="cursor-help text-[12px] text-faint underline decoration-dotted underline-offset-4">what's this?</span></Tip></div>
            <div className="mt-2 font-display text-[44px] leading-none font-semibold tabular-nums">{r.score.toFixed(1)}<span className="text-[20px] text-faint">/100</span></div>
            <div className="mt-2 flex items-center gap-1.5 text-[13px]" style={{ color: verdictColor }}><ArrowUpRight size={15} className={phish ? '' : 'rotate-90'} />{phish ? `${(r.score - 50).toFixed(1)} above threshold` : `${(50 - r.score).toFixed(1)} below threshold`}</div>
          </div>
          <div className="mt-2"><ParticleWave intensity={r.score} from={phish ? '#5b5bf6' : '#34d399'} to={phish ? '#fb7185' : '#60a5fa'} height={110} /></div>
        </Card>

        <Card i={2} bodyClass="px-6 pt-5 pb-6">
          <span className="font-display text-[16px] font-medium">Threat level</span>
          <div className="mt-2 font-display text-[38px] leading-none font-semibold" style={{ color: levelColor }}>{r.threat_level}</div>
          <div className="mt-2 text-[13px] text-dim">{d.signals} signals combined with the score</div>
          <div className="mt-6"><DotMatrix filled={Math.round((r.score / 100) * 96)} color={levelColor} /></div>
        </Card>

        <Card i={3} bodyClass="pt-5">
          <div className="px-6">
            <span className="font-display text-[16px] font-medium">Rule indicators</span>
            <div className="mt-2 font-display text-[38px] leading-none font-semibold tabular-nums">{r.warnings.length}</div>
            <div className="mt-2 flex gap-3 text-[13px]">
              <span style={{ color: SEV.high }}>{r.warnings.filter(w => w.severity === 'high').length} high</span>
              <span style={{ color: SEV.medium }}>{r.warnings.filter(w => w.severity === 'medium').length} medium</span>
              <span className="text-dim">{r.warnings.filter(w => w.severity === 'low').length} low</span>
            </div>
          </div>
          <div className="mt-3 h-[96px]"><AreaSpark values={[0, ...r.warnings.map((_, i, a) => a.slice(0, i + 1).reduce((s, x) => s + (x.severity === 'high' ? 3 : x.severity === 'medium' ? 2 : 1), 0))]} color="#34d399" height={96} /></div>
        </Card>

        <Card i={4} bodyClass="px-6 pt-5 pb-5">
          <span className="font-display text-[16px] font-medium">Links found</span>
          <div className="mt-2 font-display text-[38px] leading-none font-semibold tabular-nums">{r.urls.length}</div>
          <div className="mt-2 text-[13px]" style={{ color: r.urls.some(u => u.risk === 'high') ? SEV.high : '#a3abc8' }}>{r.urls.filter(u => u.risk === 'high').length} high-risk · never opened</div>
          <div className="mt-4 h-[84px]"><LineDots values={r.urls.map(u => u.indicators.length + (u.risk === 'high' ? 3 : u.risk === 'medium' ? 1 : 0))} color="#8b8dff" height={84} /></div>
        </Card>
      </div>

      {/* Breakdown + pipeline */}
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <Card i={5} title="Signal breakdown">
          <div className="flex flex-col items-center gap-6 @md:flex-row">
            <Donut size={200} thickness={30} data={Object.entries(d.cats).map(([k, v]) => ({ label: k, value: v, color: CAT[k as keyof typeof CAT] }))}
              center={<><div className="font-display text-[34px] leading-none font-semibold">{d.signals}</div><div className="mt-1 text-[12.5px] text-dim">Total signals</div></>} />
            <ul className="w-full flex-1 space-y-3.5">
              {Object.entries(d.cats).map(([k, v]) => (
                <li key={k} className="flex items-center gap-3 text-[14px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT[k as keyof typeof CAT] }} />
                  <span className={`flex-1 ${v ? '' : 'text-faint'}`}>{k}</span>
                  <span className="font-mono text-[12.5px] text-dim tabular-nums">{v}</span>
                  <span className="w-12 text-right font-mono text-[12.5px] tabular-nums">{d.signals ? Math.round((v / d.signals) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card i={6} title="Detection pipeline" right={<span className="text-[12px] text-faint">How the email was narrowed down</span>}>
          <div className="grid grid-cols-4 gap-2">
            {funnel.map((s, i) => (
              <div key={s.label} className="text-center">
                <div className="text-[12.5px] text-dim">{i + 1}. {s.label}</div>
                <div className="mt-1 font-display text-[26px] font-semibold tabular-nums">{s.value}</div>
                <span className="mt-2 inline-block rounded-lg border border-white/15 px-2.5 py-1 font-mono text-[11.5px]">{i === 0 ? '100%' : `${funnel[i - 1].value ? Math.round((s.value / funnel[i - 1].value) * 1000) / 10 : 0}%`}</span>
              </div>
            ))}
          </div>
          <div className="mt-2"><Funnel stages={funnel} height={150} /></div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px]">
            <span>Phishing score</span><span className="font-mono font-semibold" style={{ color: verdictColor }}>{r.score.toFixed(1)}%</span>
          </div>
        </Card>
      </div>

      {/* Words · bubbles · actions */}
      <div className="grid gap-4 @4xl:grid-cols-3">
        <Card i={7} title="Top signal words" right={<span className="text-[12px] text-faint">Weight</span>}>
          {d.up.length === 0 ? <p className="py-6 text-[14px] text-dim">{r.engine.key === 'bert' ? 'Sentence-BERT reads meaning as a whole, so there are no word-level weights.' : 'No words pushed the score toward phishing.'}</p> : (
            <ul className="space-y-3.5">
              {d.up.slice(0, 6).map((t, i) => (
                <li key={t.term} className="grid grid-cols-[minmax(0,7.5rem)_1fr_3rem] items-center gap-3 text-[14px]">
                  <span className="truncate text-dim">{t.term}</span>
                  <span className="h-[5px] rounded-full bg-white/[0.05]"><motion.span className="block h-full rounded-full" style={{ background: 'linear-gradient(90deg,#5b5bf6,#8b8dff)', boxShadow: '0 0 12px rgba(91,91,246,.6)' }} initial={{ width: 0 }} animate={{ width: `${(t.weight / maxW) * 100}%` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.7 }} /></span>
                  <span className="text-right font-mono text-[12.5px] tabular-nums">{t.weight.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card i={8} title="Severity mix" bodyClass="px-4 pt-2 pb-4">
          <Bubbles items={[
            { label: 'High', value: d.sevCount.high, color: '#e11d48' },
            { label: 'Medium', value: d.sevCount.medium, color: '#d97706' },
            { label: 'Low', value: d.sevCount.low, color: '#5b5bf6' },
          ]} />
        </Card>

        <Card i={9} title="Recommended actions">
          <ul className="divide-y divide-white/[0.06]">
            {r.recommendations.map((rec, i) => (
              <li key={rec} className="flex gap-4 py-3 text-[13.5px] leading-snug">
                <span className="flex-1 text-fg/90">{rec}</span>
                <span className="shrink-0 text-[12px] text-faint">{steps[i] ?? ''}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* AI explanation + sender */}
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <motion.section custom={10} variants={rise} initial="hidden" animate="show" className="relative overflow-hidden rounded-[18px] border border-indigo/30 p-6" style={{ background: 'linear-gradient(135deg, rgba(91,91,246,0.28), rgba(124,92,246,0.16) 45%, rgba(13,20,48,0.7))' }}>
          <div className="flex items-center gap-2.5"><Sparkles size={18} className="text-[#b4b5ff]" /><h3 className="font-display text-[18px] font-medium">AI explanation</h3>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11.5px] text-[#c7c8ff]">{r.source === 'demo' ? 'Demo' : 'Model'}</span></div>
          <p className="mt-3 max-w-[72ch] text-[15px] leading-relaxed text-fg/90">{r.explanation}</p>
          {r.comparison.length > 0 && (
            <div className="mt-5 grid gap-3 @xl:grid-cols-2">
              {r.comparison.map(c => (
                <div key={c.engine} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-baseline justify-between text-[13px]"><span className="text-dim">{c.engine === 'tfidf' ? 'TF-IDF' : 'Sentence-BERT'}</span><span className="font-mono font-semibold">{c.score == null ? c.status : c.score.toFixed(1)}</span></div>
                  {c.score != null && <div className="mt-2 h-[5px] rounded-full bg-white/10"><motion.div className="h-full rounded-full" style={{ background: c.score >= 50 ? 'linear-gradient(90deg,#7c5cf6,#fb7185)' : 'linear-gradient(90deg,#5b5bf6,#34d399)' }} initial={{ width: 0 }} animate={{ width: `${c.score}%` }} transition={{ duration: 0.9 }} /></div>}
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <Card i={11} title="Sender">
          {!r.sender ? <p className="text-[14px] text-dim">No sender provided. Add the address to run impersonation checks.</p> : (<>
            <div className="truncate rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 font-mono text-[12.5px]" title={r.sender.address}>{r.sender.address}</div>
            <ul className="mt-4 space-y-3">
              {r.sender.indicators.length === 0 && <li className="text-[14px] text-dim">No sender warnings.</li>}
              {r.sender.indicators.map(i => (
                <li key={i.label} className="flex gap-3 text-[13.5px]"><span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: SEV[i.severity], boxShadow: `0 0 8px ${SEV[i.severity]}` }} /><span><span className="text-fg">{i.label}</span><span className="block text-[12.5px] text-dim">{i.detail}</span></span></li>
              ))}
            </ul>
          </>)}
        </Card>
      </div>

      {/* Indicators table */}
      <Card i={12} title="Indicators" right={<span className="font-mono text-[12px] text-faint">{r.warnings.length} found</span>} bodyClass="px-2 pt-3 pb-3">
        {r.warnings.length === 0 ? <p className="px-4 py-4 text-[14px] text-dim">No rule-based warning signs were found in the text.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead><tr className="text-[12px] text-faint"><th className="px-4 py-2.5 font-medium">Indicator</th><th className="hidden px-4 py-2.5 font-medium sm:table-cell">Category</th><th className="px-4 py-2.5 font-medium">Severity</th><th className="w-10" /></tr></thead>
              <tbody>
                {r.warnings.map(w => (
                  <Fragment key={w.id}>
                    <tr className="cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.03]" onClick={() => setOpenWarn(o => o === w.id ? null : w.id)}>
                      <td className="px-4 py-3.5">{w.title}</td>
                      <td className="hidden px-4 py-3.5 text-dim sm:table-cell">{w.category}</td>
                      <td className="px-4 py-3.5"><SevBox s={w.severity} /></td>
                      <td className="px-2"><ChevronDown size={15} className={`text-faint transition-transform ${openWarn === w.id ? 'rotate-180' : ''}`} /></td>
                    </tr>
                    <AnimatePresence initial={false}>
                      {openWarn === w.id && (
                        <tr><td colSpan={4} className="px-4 pb-4">
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[12.5px]"><span className="text-faint">Found in the email:</span>
                              {w.evidence.map(e => <span key={e} className="rounded-lg px-2.5 py-1 font-mono" style={{ color: SEV[w.severity], background: SEV[w.severity] + '14', border: `1px solid ${SEV[w.severity]}33` }}>{e}</span>)}
                            </div>
                          </motion.div>
                        </td></tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Links table */}
      <Card i={13} title="Extracted links" right={<span className="text-[12px] text-faint">Static checks · never opened</span>} bodyClass="px-2 pt-3 pb-3">
        {r.urls.length === 0 ? <p className="px-4 py-4 text-[14px] text-dim">No links were found in this email.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead><tr className="text-[12px] text-faint"><th className="px-4 py-2.5 font-medium">URL</th><th className="hidden px-4 py-2.5 font-medium md:table-cell">Host</th><th className="px-4 py-2.5 font-medium">Risk</th><th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Signals</th><th className="w-10" /></tr></thead>
              <tbody>
                {r.urls.map(u => (
                  <Fragment key={u.url}>
                    <tr className="cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.03]" onClick={() => setOpenUrl(o => o === u.url ? null : u.url)}>
                      <td className="max-w-[340px] truncate px-4 py-3.5 font-mono text-[12.5px]" title={u.url}>{u.url}</td>
                      <td className="hidden px-4 py-3.5 font-mono text-[12.5px] text-dim md:table-cell">{u.host}</td>
                      <td className="px-4 py-3.5"><SevBox s={u.risk} /></td>
                      <td className="hidden px-4 py-3.5 text-right font-mono tabular-nums sm:table-cell">{u.indicators.length}</td>
                      <td className="px-2"><ChevronDown size={15} className={`text-faint transition-transform ${openUrl === u.url ? 'rotate-180' : ''}`} /></td>
                    </tr>
                    {openUrl === u.url && (
                      <tr><td colSpan={5} className="px-4 pb-4">
                        <ul className="grid gap-x-8 gap-y-3 pt-1 @2xl:grid-cols-2">
                          {u.indicators.length === 0 && <li className="text-[13px] text-dim">No structural warning signs.</li>}
                          {u.indicators.map(i => <li key={i.label} className="flex gap-3 text-[13px]"><span className="mt-[6px] h-2 w-2 shrink-0 rounded-full" style={{ background: SEV[i.severity] }} /><span><span className="text-fg">{i.label}</span><span className="block text-[12.5px] text-dim">{i.detail}</span></span></li>)}
                        </ul>
                        <button className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-[#b4b5ff] hover:underline" onClick={() => { void navigator.clipboard?.writeText(u.url); toast({ kind: 'info', title: 'URL copied as text' }) }}><Copy size={13} />Copy as text</button>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
