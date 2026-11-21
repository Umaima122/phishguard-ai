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

function Lessons() {
  const [active, setActive] = useState(lessons[0].id)
  const [read, setRead] = useState<Set<string>>(() => new Set(JSON.parse(store.get('pg-read') || '[]') as string[]))
  useEffect(() => { setRead(r => { const n = new Set(r).add(active); store.set('pg-read', JSON.stringify([...n])); return n }) }, [active])
  const l = lessons.find(x => x.id === active)!
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <div className="panel p-2">
        <div className="flex items-center justify-between px-3 py-2 text-xs text-dim"><span>Lessons</span><span className="font-mono">{read.size}/{lessons.length} read</span></div>
        <div className="mx-3 mb-2 h-1 rounded-[1px] bg-white/[0.06]"><motion.div className="h-full rounded-[1px] bg-cyan" animate={{ width: `${(read.size / lessons.length) * 100}%` }} /></div>
        <div className="flex gap-1 overflow-x-auto lg:flex-col">
          {lessons.map((x, i) => (
            <button key={x.id} onClick={() => setActive(x.id)} className={`relative flex shrink-0 items-center gap-3 rounded-[3px] px-3 py-2.5 text-left text-sm transition ${active === x.id ? 'text-fg' : 'text-dim hover:text-fg'}`}>
              {active === x.id && <motion.span layoutId="lesson" className="absolute inset-0 rounded-[3px] bg-white/[0.06]" />}
              <span className="relative font-mono text-[11px] text-cyan">0{i + 1}</span><span className="relative whitespace-nowrap">{x.title}</span>
              {read.has(x.id) && <CircleCheck size={14} className="relative ml-auto hidden text-safe lg:block" />}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={l.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="panel p-6 md:p-8">
          <div className="eyebrow">Lesson {lessons.indexOf(l) + 1}</div>
          <h3 className="h-display mt-2 text-2xl font-semibold">{l.title}</h3>
          <p className="mt-2 text-dim">{l.summary}</p>
          <ul className="mt-6 space-y-3">{l.points.map(p => <li key={p} className="flex gap-3 text-[15px]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-[1px] bg-cyan" />{p}</li>)}</ul>
          <div className="mt-6 rounded-[3px] border border-danger/25 bg-danger/[0.06] p-4"><div className="font-mono text-[10px] text-danger">Example red flag</div><div className="mt-1.5 font-mono text-[13px] text-fg/90">{l.example}</div></div>
          {lessons.indexOf(l) < lessons.length - 1 && <button className="btn btn-ghost mt-6" onClick={() => setActive(lessons[lessons.indexOf(l) + 1].id)}>Next lesson<ArrowRight size={15} /></button>}
        </motion.div>
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
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-[4px] border border-cyan/30 bg-cyan/10 text-cyan"><Trophy size={28} /></div>
              <div className="h-display mt-5 text-4xl font-semibold">{score}/{quiz.length}</div>
              <p className="mt-2 text-dim">{score === quiz.length ? 'Perfect. You spot phishing like a pro.' : score >= quiz.length - 2 ? 'Strong instincts. Review the lessons for the ones you missed.' : 'Good start. The lessons above cover every question.'}</p>
              <button className="btn btn-primary mt-6" onClick={restart}><RotateCcw size={16} />Try again</button>
            </motion.div>
          ) : (
            <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <div className="rounded-[3px] border border-line bg-ink/40 p-4 text-[15px] leading-relaxed text-fg/90">{q.scenario}</div>
              <h3 className="h-display mt-5 text-xl font-medium">{q.question}</h3>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {q.options.map((o, n) => {
                  const state = picked === null ? 'idle' : n === q.correct ? 'right' : n === picked ? 'wrong' : 'dim'
                  return (
                    <motion.button key={o} whileTap={picked === null ? { scale: 0.98 } : undefined} onClick={() => pick(n)} disabled={picked !== null}
                      className={`flex items-center gap-3 rounded-[3px] border px-4 py-3.5 text-left text-sm transition ${state === 'idle' ? 'border-line bg-white/[0.02] hover:border-cyan/40 hover:bg-cyan/[0.04]' : state === 'right' ? 'border-safe/50 bg-safe/10' : state === 'wrong' ? 'border-danger/50 bg-danger/10' : 'border-line opacity-50'}`}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[2px] border border-line font-mono text-[11px] text-dim">{String.fromCharCode(65 + n)}</span>
                      <span className="flex-1">{o}</span>
                      {state === 'right' && <CircleCheck size={18} className="text-safe" />}{state === 'wrong' && <CircleX size={18} className="text-danger" />}
                    </motion.button>
                  )
                })}
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                    <div className={`mt-5 rounded-[3px] border p-4 text-sm ${picked === q.correct ? 'border-safe/30 bg-safe/[0.06]' : 'border-danger/30 bg-danger/[0.06]'}`}>
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
