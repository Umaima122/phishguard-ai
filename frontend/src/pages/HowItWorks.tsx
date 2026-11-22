import { motion } from 'framer-motion'
import { ArrowRight, Binary, Brain, FileText, Inbox, Layers, ShieldCheck, Sparkles, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeader } from '../components/ui'
import { useApp } from '../lib/store'

const STEPS = [
  { icon: Inbox, t: 'Email input', d: 'Subject, sender and body are joined into one text.' },
  { icon: Wand2, t: 'Preprocessing', d: 'Lower-casing; links, emails, amounts and card numbers become tokens.' },
  { icon: Binary, t: 'Feature extraction', d: 'TF-IDF word and bigram weights, or 384-dim Sentence-BERT embeddings.' },
  { icon: Brain, t: 'ML model', d: 'Logistic Regression with balanced class weights.' },
  { icon: ShieldCheck, t: 'Classification', d: 'Score ≥ 50 → Potential Phishing; otherwise Likely Legitimate.' },
  { icon: Sparkles, t: 'Security explanation', d: 'Word contributions, rule checks, URL and sender analysis.' },
]

export default function HowItWorks() {
  const { engine, backend } = useApp()
  const t = engine('tfidf')?.metrics, b = engine('bert')?.metrics
  const rows: [string, string, string][] = [
    ['Features', 'Word & bigram frequencies (TF-IDF, 60k terms)', 'Sentence embeddings (all-MiniLM-L6-v2, 384 dims)'],
    ['Understands', 'Which words appear', 'What the text means'],
    ['Explainability', 'Per-word contribution to the score', 'Score only'],
    ['Speed', 'Instant, ships pre-trained', 'Slower; trained once during deploy'],
    ['Test accuracy', t ? `${(t.accuracy * 100).toFixed(2)}%` : backend === 'online' ? '—' : 'Connect backend', b ? `${(b.accuracy * 100).toFixed(2)}%` : '—'],
    ['Test F1', t ? `${(t.f1 * 100).toFixed(2)}%` : '—', b ? `${(b.f1 * 100).toFixed(2)}%` : '—'],
  ]
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 lg:px-8">
      <SectionHeader eyebrow="How it works" title="From raw email to explained verdict" sub="PhishGuard combines a trained machine-learning classifier with transparent rule-based checks, so you see the decision and the reasons behind it." />

      <div className="relative">
        <div className="absolute left-[19px] top-6 bottom-6 w-px bg-cyan/30 md:hidden" />
        <div className="grid gap-3 md:grid-cols-6">
          {STEPS.map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="relative flex gap-4 md:flex-col md:gap-0">
              <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan/30 bg-deep text-cyan"><s.icon size={18} /></div>
              {i < STEPS.length - 1 && <motion.div className="absolute left-12 top-5 hidden h-px bg-cyan/30 md:block" style={{ right: '-0.75rem' }} initial={{ scaleX: 0, originX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }} />}
              <div className="pb-4 md:pt-4"><div className="font-mono text-[10px] text-faint">0{i + 1}</div><div className="mt-1 text-sm font-medium">{s.t}</div><div className="mt-1 text-[13px] leading-relaxed text-dim">{s.d}</div></div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-16 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4"><Layers size={16} className="text-cyan" /><h3 className="font-display text-[15px] font-medium">Two engines, same test split</h3></div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-faint"><th className="px-5 py-3 font-normal" /><th className="px-4 py-3 font-normal">TF-IDF + LR <span className="text-cyan">baseline</span></th><th className="px-4 py-3 font-normal">Sentence-BERT + LR <span className="text-violet">semantic</span></th></tr></thead>
            <tbody>{rows.map(([k, a, c]) => <tr key={k} className="border-b border-line/60 last:border-0"><td className="whitespace-nowrap px-5 py-3 text-dim">{k}</td><td className="px-4 py-3">{a}</td><td className="px-4 py-3">{c}</td></tr>)}</tbody>
          </table></div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-2"><FileText size={16} className="text-cyan" /><h3 className="font-display text-[15px] font-medium">Honest evaluation</h3></div>
          <ul className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-dim">
            <li>Exact duplicates are removed <span className="text-fg">before</span> the 80/20 split, so the same email can't appear in both training and test sets.</li>
            <li>Metrics come from emails the model never saw during training.</li>
            <li>The score is a model estimate, not a guaranteed probability. False positives and false negatives still happen; the dashboard shows both.</li>
            <li>Rule checks explain the result but can fire on legitimate mail too.</li>
          </ul>
        </div>
      </div>

      <div className="panel mt-5 p-5">
        <div className="mb-4 font-display text-[15px] font-medium">Tech stack</div>
        <div className="flex flex-wrap gap-2">{['Python', 'scikit-learn', 'TF-IDF', 'Logistic Regression', 'sentence-transformers', 'FastAPI', 'SQLite', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Recharts', 'Docker', 'Hugging Face Spaces'].map(s => <span key={s} className="rounded-lg border border-line bg-white/[0.02] px-3 py-1.5 font-mono text-xs text-dim">{s}</span>)}</div>
      </div>

      <div className="mt-10 flex justify-center"><Link to="/analyze" className="btn btn-primary !px-5 !py-3">See it on a real email<ArrowRight size={16} /></Link></div>
    </div>
  )
}
