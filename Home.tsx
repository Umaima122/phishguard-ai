import { motion } from 'framer-motion'
import { ArrowRight, AtSign, Brain, FileText, GraduationCap, LayoutDashboard, Link2, ScanSearch, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeroVisual } from '../components/HeroVisual'
import { Counter, DemoBadge } from '../components/ui'
import { demoStats } from '../data/demoData'
import { api } from '../lib/api'
import { useApp } from '../lib/store'
import type { Stats } from '../lib/types'

const up = { hidden: { opacity: 0, y: 18 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } }) }

const FEATURES = [
  { icon: Brain, title: 'Two ML engines', body: 'A TF-IDF + Logistic Regression baseline and a Sentence-BERT semantic model, trained on the same split so you can compare them.' },
  { icon: Sparkles, title: 'Explains its verdict', body: 'See the exact words that pushed the score up or down, plus the rule checks that fired.' },
  { icon: Link2, title: 'Static link inspection', body: 'Look-alike domains, raw IP hosts, punycode, shorteners and risky TLDs. Links are never opened.' },
  { icon: AtSign, title: 'Sender analysis', body: 'Catches brands on free webmail, look-alike domains and mismatches between sender and link domains.' },
  { icon: FileText, title: 'Downloadable reports', body: 'Export a clean, printable security report for any analysis.' },
  { icon: GraduationCap, title: 'Awareness training', body: 'Short lessons and a scored quiz built around realistic scenarios.' },
]

export default function Home() {
  const { backend, engine } = useApp()
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { if (backend === 'online') api.stats().then(setStats).catch(() => setStats(null)) }, [backend])
  const m = engine('tfidf')?.metrics
  const live = backend === 'online' && !!m

  const cards = live ? [
    { label: 'Emails analyzed', value: stats?.total ?? 0, note: 'Saved analyses on this server' },
    { label: 'Threats identified', value: stats?.phishing ?? 0, note: 'Flagged as potential phishing' },
    { label: 'Test-set accuracy', value: m.accuracy * 100, dec: 1, suffix: '%', note: `${m.test_size.toLocaleString()} held-out emails` },
    { label: 'Training emails', value: m.dataset.usable_rows, note: `${m.dataset.duplicates_removed.toLocaleString()} duplicates removed` },
  ] : [
    { label: 'Emails analyzed', value: demoStats.total, note: 'Sample figure' },
    { label: 'Threats identified', value: demoStats.phishing, note: 'Sample figure' },
    { label: 'Detection accuracy', value: 0, note: 'Connect the backend for measured accuracy', na: true },
    { label: 'URLs inspected', value: demoStats.urls_inspected, note: 'Sample figure' },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-bg" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-24">
          <div>
            <motion.div variants={up} initial="hidden" animate="show" className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-xs text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_#00E5FF]" />Think Before You Click. Let AI Investigate.
            </motion.div>
            <motion.h1 variants={up} custom={1} initial="hidden" animate="show" className="h-display mt-6 text-[2.75rem] font-semibold leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
              Your Inbox.<br /><span className="bg-gradient-to-r from-cyan via-[#7dd3fc] to-violet bg-clip-text text-transparent">Under AI Protection.</span>
            </motion.h1>
            <motion.p variants={up} custom={2} initial="hidden" animate="show" className="mt-6 max-w-xl text-lg leading-relaxed text-dim">
              Detect phishing attempts, uncover suspicious links, and understand digital threats before they reach you.
            </motion.p>
            <motion.div variants={up} custom={3} initial="hidden" animate="show" className="mt-9 flex flex-wrap gap-3">
              <Link to="/analyze" className="btn btn-primary !px-5 !py-3 text-[15px]"><ScanSearch size={18} />Analyze an Email</Link>
              <a href="#platform" className="btn btn-ghost !px-5 !py-3 text-[15px]">Explore Platform<ArrowRight size={16} /></a>
            </motion.div>
            <motion.div variants={up} custom={4} initial="hidden" animate="show" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-faint">
              <span>scikit-learn</span><span>Sentence-BERT</span><span>FastAPI</span><span>No links opened</span>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }}><HeroVisual /></motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="eyebrow !text-faint">{live ? 'Live platform metrics' : 'Platform metrics'}</div>
          {!live && <DemoBadge label={backend === 'checking' ? 'Loading' : 'Demo data'} />}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div key={c.label} variants={up} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} className="panel panel-hover p-5">
              <div className="text-[13px] text-dim">{c.label}</div>
              <div className="h-display mt-3 text-3xl font-semibold tabular-nums md:text-4xl">
                {'na' in c && c.na ? <span className="text-faint">—</span> : <Counter value={c.value} decimals={'dec' in c ? c.dec : 0} suffix={'suffix' in c ? c.suffix : ''} />}
              </div>
              <div className="mt-2 text-xs text-faint">{c.note}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="platform" className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-24 lg:px-8">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">The platform</div>
          <h2 className="h-display text-3xl font-semibold md:text-4xl">A threat-intelligence workflow for every inbox.</h2>
          <p className="mt-4 text-dim">Machine learning gives the verdict. Rule checks, link inspection and sender analysis explain it.</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} variants={up} custom={i % 3} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="panel panel-hover group p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-gradient-to-br from-cyan/15 to-violet/15 text-cyan transition group-hover:shadow-[0_0_24px_-4px_#00E5FF]"><f.icon size={19} /></div>
              <div className="mt-5 font-display text-lg font-medium">{f.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-dim">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pt-24 lg:px-8">
        <div className="panel relative overflow-hidden p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-violet/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="h-display text-3xl font-semibold">Got a suspicious email right now?</h2>
              <p className="mt-3 text-dim">Paste it in. You'll get a verdict, the reasons behind it, and what to do next in a few seconds.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/analyze" className="btn btn-primary !px-5 !py-3"><ScanSearch size={18} />Analyze an Email</Link>
              <Link to="/dashboard" className="btn btn-ghost !px-5 !py-3"><LayoutDashboard size={17} />View dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
