import { AnimatePresence, motion } from 'framer-motion'
import { AtSign, ChevronDown, Eraser, FlaskConical, Inbox, Mail, ScanSearch, Type } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnalysisResults } from '../components/AnalysisResults'
import { ScanSequence } from '../components/ScanSequence'
import { EmptyState, SectionHeader, Tip } from '../components/ui'
import { sampleEmails } from '../data/sampleEmails'
import { ApiError, api } from '../lib/api'
import { analyzeDemo } from '../lib/demo'
import { useApp } from '../lib/store'
import type { AnalysisResult, EngineChoice } from '../lib/types'

const MAX = 50000
type Phase = 'idle' | 'scanning' | 'done'

export default function Analyzer() {
  const { backend, engine, toast, addSessionResult, setLastResult } = useApp()
  const [subject, setSubject] = useState('')
  const [sender, setSender] = useState('')
  const [body, setBody] = useState('')
  const [choice, setChoice] = useState<EngineChoice>('tfidf')
  const [save, setSave] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [pending, setPending] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [sampleOpen, setSampleOpen] = useState(false)
  const [meta, setMeta] = useState({ subject: '', sender: '' })
  const resultsRef = useRef<HTMLDivElement>(null)

  const demo = backend !== 'online'
  const bert = engine('bert')
  const bertReady = bert?.status === 'ready'
  useEffect(() => { if (!bertReady && choice !== 'tfidf') setChoice('tfidf') }, [bertReady, choice])

  const senderInvalid = sender.trim() !== '' && !/[\w.+-]+@[\w-]+(\.[\w-]+)+/.test(sender)
  const tooShort = body.trim().length > 0 && body.trim().length < 10

  const loadSample = (id: string) => {
    const s = sampleEmails.find(x => x.id === id)!
    setSubject(s.subject); setSender(s.sender); setBody(s.body); setSampleOpen(false); setError('')
    toast({ kind: 'info', title: `Loaded sample: ${s.label}` })
  }
  const clear = () => { setSubject(''); setSender(''); setBody(''); setError(''); setResult(null); setPhase('idle') }

  const run = async () => {
    if (body.trim().length < 10) { setError('Paste the email body first (at least 10 characters).'); return }
    setError(''); setResult(null); setPending(null); setPhase('scanning')
    setMeta({ subject, sender })
    window.scrollTo({ top: (resultsRef.current?.offsetTop ?? 0) - 90, behavior: 'smooth' })
    const req = { subject, sender, body, engine: choice, save_to_history: save }
    try {
      if (demo) {
        await new Promise(r => setTimeout(r, 600))
        setPending(analyzeDemo(req))
      } else {
        setPending(await api.analyze(req))
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Unexpected error'
      if (e instanceof ApiError && e.status === 0) {
        toast({ kind: 'error', title: 'Backend unreachable', body: 'Showing a labelled demo assessment instead.' })
        setPending(analyzeDemo(req))
      } else {
        setPhase('idle'); setError(msg)
        toast({ kind: 'error', title: 'Analysis failed', body: msg })
      }
    }
  }

  const finish = useCallback(() => {
    if (!pending) return
    setResult(pending); setPhase('done'); setLastResult(pending)
    if (pending.source === 'demo') addSessionResult(pending)
    if (pending.saved) toast({ kind: 'success', title: 'Saved to history' })
  }, [pending, addSessionResult, setLastResult, toast])

  const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void run() }

  const engines: { k: EngineChoice; label: string; hint: string; ok: boolean }[] = [
    { k: 'tfidf', label: 'TF-IDF', hint: 'Fast word-pattern model with per-word explanations', ok: !demo },
    { k: 'bert', label: 'BERT', hint: bertReady ? 'Sentence-BERT semantic model' : `Sentence-BERT is ${bert?.status ?? 'unavailable'}`, ok: !demo && bertReady },
    { k: 'compare', label: 'Compare', hint: bertReady ? 'Run both models side by side' : 'Needs the BERT engine', ok: !demo && bertReady },
  ]

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 lg:px-8">
      <SectionHeader eyebrow="Email Analysis Studio" title="Investigate an email" sub="Paste the subject, sender and body. PhishGuard runs the machine-learning model, checks the language, links and sender, then explains what it found." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* Input */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-5" onKeyDown={onKey}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium"><Mail size={16} className="text-cyan" />Email input</div>
              <div className="relative">
                <button className="btn btn-quiet !px-2.5 !py-1.5 text-xs" onClick={() => setSampleOpen(o => !o)} aria-expanded={sampleOpen}><FlaskConical size={14} />Load sample<ChevronDown size={14} /></button>
                <AnimatePresence>
                  {sampleOpen && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="panel absolute right-0 z-30 mt-2 w-72 bg-deep p-1.5">
                      {sampleEmails.map(s => (
                        <button key={s.id} onClick={() => loadSample(s.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.05]">
                          <span>{s.label}</span>
                          <span className={`font-mono text-[10px] uppercase ${s.kind === 'phishing' ? 'text-danger' : s.kind === 'legitimate' ? 'text-safe' : 'text-warn'}`}>{s.kind}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-dim"><Type size={13} />Subject</label>
            <input className="field mb-4" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Action required: verify your account" maxLength={500} />

            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-dim"><AtSign size={13} />Sender <span className="text-faint">(optional)</span></label>
            <input className={`field mb-1 font-mono text-[13.5px] ${senderInvalid ? '!border-warn/60' : ''}`} value={sender} onChange={e => setSender(e.target.value)} placeholder="Name <name@domain.com>" maxLength={320} />
            <div className="mb-4 h-4 text-[11px] text-warn">{senderInvalid && 'That doesn’t look like an email address. It will be flagged in the report.'}</div>

            <div className="mb-1.5 flex items-center justify-between text-xs text-dim">
              <label className="flex items-center gap-1.5"><Inbox size={13} />Email body</label>
              <span className={`font-mono ${body.length > MAX * 0.9 ? 'text-warn' : 'text-faint'}`}>{body.length.toLocaleString()} / {MAX.toLocaleString()}</span>
            </div>
            <textarea className={`field min-h-[240px] resize-y leading-relaxed ${error || tooShort ? '!border-danger/50' : ''}`} value={body} onChange={e => { setBody(e.target.value); setError('') }}
              placeholder="Paste the full email body here, including any links…" maxLength={MAX} />
            <div className="mt-1.5 min-h-4 text-[12px] text-danger">{error || (tooShort ? 'Add a bit more text (10+ characters).' : '')}</div>

            <div className="mt-3">
              <div className="mb-1.5 text-xs text-dim">Model</div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-ink/50 p-1">
                {engines.map(e => (
                  <Tip key={e.k} text={demo ? 'Backend offline: demo heuristic only' : e.hint}>
                    <button disabled={!e.ok} onClick={() => setChoice(e.k)} className={`relative w-full rounded-lg px-2 py-2 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${choice === e.k && e.ok ? 'text-ink' : 'text-dim hover:text-fg'}`}>
                      {choice === e.k && e.ok && <motion.span layoutId="eng" className="absolute inset-0 rounded-lg bg-cyan" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
                      <span className="relative">{e.label}</span>
                    </button>
                  </Tip>
                ))}
              </div>
              {!demo && bert && !bertReady && <div className="mt-1.5 text-[11px] text-faint">BERT engine: {bert.status}{bert.status === 'training' ? ' (first boot takes a few minutes)' : ''}</div>}
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink/30 p-3">
              <input type="checkbox" className="peer sr-only" checked={save} onChange={e => setSave(e.target.checked)} disabled={demo} />
              <span className="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full bg-white/10 p-0.5 transition peer-checked:bg-cyan peer-disabled:opacity-40 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan [&>span]:transition peer-checked:[&>span]:translate-x-4"><span className="h-4 w-4 rounded-full bg-fg" /></span>
              <span className="text-[12.5px] leading-snug text-dim"><span className="text-fg">Save result to history.</span> Stores the subject, sender, the first 140 characters and the result, never the full email. {demo && <span className="text-warn">Needs the backend.</span>}</span>
            </label>

            <div className="mt-5 flex gap-2">
              <button className="btn btn-ghost" onClick={clear} disabled={phase === 'scanning'}><Eraser size={16} />Clear</button>
              <button className="btn btn-primary flex-1" onClick={() => void run()} disabled={phase === 'scanning'}><ScanSearch size={17} />{phase === 'scanning' ? 'Analyzing…' : 'Analyze Email'}</button>
            </div>
            <div className="mt-2 text-center font-mono text-[10px] text-faint">Ctrl / ⌘ + Enter</div>
          </div>
        </div>

        {/* Output */}
        <div ref={resultsRef} className="min-w-0">
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="panel relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 grid-bg" />
                <div className="relative">
                  <EmptyState icon={<ScanSearch size={22} />} title="Ready to investigate" body="Paste an email on the left, or load one of the samples, then run the analysis. Links are only parsed as text and are never opened."
                    action={<button className="btn btn-ghost" onClick={() => loadSample('bank-suspend')}><FlaskConical size={16} />Try a phishing sample</button>} />
                  <div className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
                    {[['ML classification', 'TF-IDF or Sentence-BERT with Logistic Regression'], ['Static link checks', 'Look-alike domains, raw IPs, shorteners, punycode'], ['Explainable output', 'The exact words and rules behind the score']].map(([t, d]) => (
                      <div key={t} className="bg-card/80 p-5"><div className="text-sm font-medium">{t}</div><div className="mt-1 text-[13px] text-dim">{d}</div></div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {phase === 'scanning' && <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ScanSequence done={!!pending} onFinished={finish} demo={demo} /></motion.div>}
            {phase === 'done' && result && <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><AnalysisResults r={result} meta={meta} onReset={clear} /></motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
