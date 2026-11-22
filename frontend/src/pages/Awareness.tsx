import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, CircleCheck, CircleX, RotateCcw, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SectionHeader } from '../components/ui'
import { lessons, quiz } from '../data/awareness'

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } },
}

const FLAG = /(immediately|permanently closed|unless you verify|paypa1|hbl-secure-login\.top|\.top|\.xyz|@gmail\.com|6-digit code|login and|Invoice_\d+\.html|\.html)/gi

function Highlight({ text }: { text: string }) {
  const parts = text.split(FLAG)
  return <>{parts.map((p, i) => i % 2 === 1 ? <mark key={i} className="bg-transparent text-fg underline decoration-danger decoration-wavy decoration-[1.5px] underline-offset-[5px]">{p}</mark> : <span key={i}>{p}</span>)}</>
}

function Lessons() {
  const [active, setActive] = useState(0)
  const [read, setRead] = useState<Set<string>>(() => new Set(JSON.parse(store.get('pg-read') || '[]') as string[]))
  const l = lessons[active]
  useEffect(() => { setRead(r => { const n = new Set(r).add(l.id); store.set('pg-read', JSON.stringify([...n])); return n }) }, [l.id])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea')) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') setActive(a => Math.min(lessons.length - 1, a + 1))
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') setActive(a => Math.max(0, a - 1))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  const progress = lessons.length > 1 ? active / (lessons.length - 1) : 1

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
      {/* Timeline */}
      <nav aria-label="Lessons" className="relative">
        <div className="mb-5 flex items-baseline justify-between text-[13px]">
          <span className="text-dim">Your path</span>
          <span className="font-mono text-[12px] text-faint">{read.size} of {lessons.length} explored</span>
        </div>
        <div className="relative">
          <span className="absolute top-3 bottom-3 left-[7px] w-px bg-white/[0.08]" />
          <motion.span className="absolute top-3 left-[7px] w-px origin-top bg-cyan" style={{ height: 'calc(100% - 24px)' }} initial={false} animate={{ scaleY: progress }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} />
          <ol className="relative space-y-1">
            {lessons.map((x, i) => {
              const isActive = i === active, done = read.has(x.id) && !isActive
              return (
                <li key={x.id}>
                  <button onClick={() => setActive(i)} className="group flex w-full items-center gap-4 py-2.5 text-left">
                    <span className="relative grid h-[15px] w-[15px] shrink-0 place-items-center">
                      <motion.span className="absolute inset-0 rounded-lg border" initial={false}
                        animate={{ borderColor: isActive ? '#8B8DFF' : i <= active ? 'rgba(139,141,255,0.5)' : 'rgba(148,163,194,0.25)', backgroundColor: isActive ? 'rgba(139,141,255,0.15)' : '#070B14', scale: isActive ? 1.15 : 1 }} />
                      {(isActive || i < active) && <motion.span layoutId={isActive ? 'lesson-dot' : undefined} className="relative h-[5px] w-[5px] bg-cyan" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[11.5px] text-faint">Lesson {String(i + 1).padStart(2, '0')}{done && <span className="ml-2 text-safe/80">read</span>}</span>
                      <span className={`block text-[14.5px] transition-colors ${isActive ? 'text-fg' : 'text-dim group-hover:text-fg'}`}>{x.title}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </nav>

      {/* Lesson body */}
      <AnimatePresence mode="wait">
        <motion.article key={l.id} className="min-w-0 max-w-[680px]"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className="font-mono text-[12px] text-cyan">{String(active + 1).padStart(2, '0')} / {String(lessons.length).padStart(2, '0')}</div>
          <h3 className="mt-2 font-display text-[30px] leading-tight font-medium tracking-tight md:text-[34px]">{l.title}</h3>
          <p className="mt-3 text-[16px] leading-relaxed text-dim">{l.summary}</p>

          <ul className="mt-8">
            {l.points.map((p, n) => (
              <motion.li key={p} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + n * 0.07 }}
                className="grid grid-cols-[2.25rem_1fr] border-t border-white/[0.06] py-3.5 text-[15px] leading-relaxed text-fg/90 last:border-b">
                <span className="pt-0.5 font-mono text-[12px] text-faint">{String(n + 1).padStart(2, '0')}</span>{p}
              </motion.li>
            ))}
          </ul>

          <motion.figure initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-8">
            <figcaption className="mb-2.5 text-[12.5px] text-faint">What it looks like in an inbox</figcaption>
            <div className="border-l-2 border-danger/70 bg-white/[0.025] py-4 pr-5 pl-5">
              <div className="flex items-center gap-2 text-[12px] text-faint"><span className="h-[6px] w-[6px] bg-danger" />Suspicious message</div>
              <p className="mt-2 text-[15px] leading-relaxed text-dim"><Highlight text={l.example} /></p>
            </div>
          </motion.figure>

          <div className="mt-9 flex items-center gap-3">
            <button className="btn btn-ghost" disabled={active === 0} onClick={() => setActive(a => a - 1)}>Previous</button>
            {active < lessons.length - 1
              ? <button className="btn btn-primary" onClick={() => setActive(a => a + 1)}>Next lesson<ArrowRight size={15} /></button>
              : <a href="#quiz" className="btn btn-primary">Take the quiz<ArrowRight size={15} /></a>}
            <span className="ml-auto hidden font-mono text-[11.5px] text-faint sm:inline">Use arrow keys to move</span>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  )
}

function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [best, setBest] = useState(() => Number(store.get('pg-best') || 0))
  const q = quiz[i]

  const pick = (n: number) => { if (picked !== null) return; setPicked(n); if (n === q.correct) setScore(s => s + 1) }
  const next = () => {
    if (i < quiz.length - 1) { setI(i + 1); setPicked(null); return }
    setDone(true)
    if (score > best) { setBest(score); store.set('pg-best', String(score)) }
  }
  const restart = () => { setI(0); setPicked(null); setScore(0); setDone(false) }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-6 py-4 text-sm">
        <span className="text-dim">Question <span className="font-mono text-fg">{done ? quiz.length : i + 1}</span> of {quiz.length}</span>
        <span className="flex items-center gap-4 font-mono text-xs"><span className="text-dim">Score <span className="text-cyan">{score}</span></span><span className="text-faint">Best {best}/{quiz.length}</span></span>
      </div>
      <div className="h-1 bg-white/[0.05]"><motion.div className="h-full bg-cyan" animate={{ width: `${((done ? quiz.length : i + (picked !== null ? 1 : 0)) / quiz.length) * 100}%` }} /></div>
      <div className="p-6 md:p-8">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan"><Trophy size={28} /></div>
              <div className="h-display mt-5 text-4xl font-semibold">{score}/{quiz.length}</div>
              <p className="mt-2 text-dim">{score === quiz.length ? 'Perfect. You spot phishing like a pro.' : score >= quiz.length - 2 ? 'Strong instincts. Review the lessons for the ones you missed.' : 'Good start. The lessons above cover every question.'}</p>
              <button className="btn btn-primary mt-6" onClick={restart}><RotateCcw size={16} />Try again</button>
            </motion.div>
          ) : (
            <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="border-l-2 border-cyan/60 py-1 pl-4 text-[16px] leading-relaxed text-fg/90">{q.scenario}</p>
              <h3 className="h-display mt-5 text-xl font-medium">{q.question}</h3>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {q.options.map((o, n) => {
                  const state = picked === null ? 'idle' : n === q.correct ? 'right' : n === picked ? 'wrong' : 'dim'
                  return (
                    <motion.button key={o} whileTap={picked === null ? { scale: 0.98 } : undefined} onClick={() => pick(n)} disabled={picked !== null}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${state === 'idle' ? 'border-line bg-white/[0.02] hover:border-cyan/40 hover:bg-cyan/[0.04]' : state === 'right' ? 'border-safe/50 bg-safe/10' : state === 'wrong' ? 'border-danger/50 bg-danger/10' : 'border-line opacity-50'}`}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-line font-mono text-[11px] text-dim">{String.fromCharCode(65 + n)}</span>
                      <span className="flex-1">{o}</span>
                      {state === 'right' && <CircleCheck size={18} className="text-safe" />}{state === 'wrong' && <CircleX size={18} className="text-danger" />}
                    </motion.button>
                  )
                })}
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                    <div className={`mt-5 rounded-xl border p-4 text-sm ${picked === q.correct ? 'border-safe/30 bg-safe/[0.06]' : 'border-danger/30 bg-danger/[0.06]'}`}>
                      <div className={`font-medium ${picked === q.correct ? 'text-safe' : 'text-danger'}`}>{picked === q.correct ? 'Correct' : 'Not quite'}</div>
                      <p className="mt-1 leading-relaxed text-dim">{q.explanation}</p>
                    </div>
                    <div className="mt-4 flex justify-end"><button className="btn btn-primary" onClick={next}>{i < quiz.length - 1 ? 'Next question' : 'See results'}<ArrowRight size={15} /></button></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function Awareness() {
  const { hash } = useLocation()
  useEffect(() => { if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 100) }, [hash])
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 lg:px-8">
      <SectionHeader eyebrow="Security Awareness Center" title="Learn to spot the hook" sub="Five short lessons on how phishing works, then a scored quiz with realistic scenarios." right={<span className="chip border-line text-dim"><BookOpen size={12} />~6 min</span>} />
      <Lessons />
      <div id="quiz" className="scroll-mt-24 pt-16">
        <div className="mb-6"><div className="eyebrow mb-2">Interactive quiz</div><h2 className="h-display text-2xl font-semibold md:text-3xl">Would you click?</h2></div>
        <Quiz />
      </div>
    </div>
  )
}
