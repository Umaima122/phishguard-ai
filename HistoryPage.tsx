import { motion } from 'framer-motion'
import { Database, Eye, History as HistoryIcon, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnalysisResults } from '../components/AnalysisResults'
import { DemoBadge, EmptyState, Modal, SectionHeader, levelStyle } from '../components/ui'
import { demoHistory } from '../data/demoData'
import { api } from '../lib/api'
import { useApp } from '../lib/store'
import type { AnalysisResult, HistoryItem } from '../lib/types'

const fromResult = (r: AnalysisResult): HistoryItem => ({
  id: r.id, created_at: r.timestamp, subject: '(this session)', sender: r.sender?.address ?? '', preview: r.explanation.slice(0, 120),
  classification: r.classification, score: r.score, threat_level: r.threat_level, engine: r.engine.key, url_count: r.urls.length, warning_count: r.warnings.length, result: r,
})

export default function HistoryPage() {
  const { backend, sessionResults, toast } = useApp()
  const demo = backend === 'offline'
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cls, setCls] = useState('')
  const [level, setLevel] = useState('')
  const [detail, setDetail] = useState<HistoryItem | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    if (backend !== 'online') return
    setLoading(true)
    try { setItems(await api.history({ q, classification: cls, level })) } catch { toast({ kind: 'error', title: 'Could not load history' }) } finally { setLoading(false) }
  }, [backend, q, cls, level, toast])

  useEffect(() => { if (backend === 'online') { const t = setTimeout(load, 250); return () => clearTimeout(t) } if (demo) setLoading(false) }, [load, backend, demo])

  const demoItems = useMemo(() => {
    const all = [...sessionResults.map(fromResult), ...demoHistory]
    const needle = q.toLowerCase()
    return all.filter(h => (!needle || `${h.subject} ${h.sender} ${h.preview}`.toLowerCase().includes(needle)) && (!cls || h.classification === cls) && (!level || h.threat_level === level))
  }, [sessionResults, q, cls, level])
  const rows = demo ? demoItems : items

  const open = async (h: HistoryItem) => {
    if (h.result || demo) { setDetail(h); return }
    try { setDetail(await api.historyItem(h.id)) } catch { toast({ kind: 'error', title: 'Could not open record' }) }
  }
  const remove = async (id: string) => {
    if (demo) { toast({ kind: 'info', title: 'Demo records can’t be deleted' }); return }
    await api.deleteHistory(id); setItems(i => i.filter(x => x.id !== id)); toast({ kind: 'success', title: 'Record deleted' })
  }
  const clearAll = async () => { await api.clearHistory(); setItems([]); setConfirmClear(false); toast({ kind: 'success', title: 'History cleared' }) }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 lg:px-8">
      <SectionHeader eyebrow="Analysis history" title="Past investigations"
        sub={demo ? 'The backend is offline, so you are seeing demo records plus anything analyzed in this tab. Persistent history needs the backend database.' : 'Saved only when you opted in. Stores subject, sender, a 140-character preview and the result, never the full email.'}
        right={demo ? <DemoBadge /> : <div className="flex items-center gap-2"><span className="chip border-line text-dim"><Database size={12} />SQLite</span>{items.length > 0 && <button className="btn btn-ghost !py-2 text-danger" onClick={() => setConfirmClear(true)}><Trash2 size={15} />Clear all</button>}</div>} />

      <div className="panel mb-4 flex flex-col gap-3 p-3 md:flex-row">
        <div className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" /><input className="field !py-2.5 !pl-10" placeholder="Search subject, sender or preview…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="field !w-auto !py-2.5" value={cls} onChange={e => setCls(e.target.value)} aria-label="Classification"><option value="">All classifications</option><option>Potential Phishing</option><option>Likely Legitimate</option></select>
        <select className="field !w-auto !py-2.5" value={level} onChange={e => setLevel(e.target.value)} aria-label="Threat level"><option value="">All threat levels</option>{['Critical', 'High', 'Medium', 'Low'].map(l => <option key={l}>{l}</option>)}</select>
      </div>

      <div className="panel overflow-hidden">
        {loading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
          : rows.length === 0 ? <EmptyState icon={<HistoryIcon size={22} />} title={q || cls || level ? 'No matches' : 'No saved analyses'} body={q || cls || level ? 'Try a different search or filter.' : 'Turn on “Save result to history” in the analyzer to keep a record here.'} action={<Link to="/analyze" className="btn btn-primary">Analyze an email</Link>} />
          : (<>
            <table className="hidden w-full text-sm md:table">
              <thead><tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-wider text-faint">
                <th className="px-5 py-3 font-normal">Date</th><th className="px-3 py-3 font-normal">Email</th><th className="px-3 py-3 font-normal">Classification</th><th className="px-3 py-3 font-normal">Score</th><th className="px-3 py-3 font-normal">Level</th><th className="px-5 py-3" />
              </tr></thead>
              <tbody>
                {rows.map((h, i) => (
                  <motion.tr key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="group border-b border-line/60 last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-dim">{new Date(h.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="max-w-[340px] px-3 py-3.5"><div className="truncate">{h.subject || '(no subject)'}</div><div className="truncate font-mono text-[11px] text-faint">{h.sender || 'no sender'}</div></td>
                    <td className="px-3 py-3.5"><span className={h.classification === 'Potential Phishing' ? 'text-danger' : 'text-safe'}>{h.classification}</span></td>
                    <td className="px-3 py-3.5 font-mono">{h.score.toFixed(1)}</td>
                    <td className="px-3 py-3.5"><span className={`chip ${levelStyle[h.threat_level].chip}`}>{h.threat_level}</span></td>
                    <td className="px-5 py-3.5 text-right"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100">
                      <button className="btn btn-quiet !p-2" onClick={() => void open(h)} aria-label="View report"><Eye size={16} /></button>
                      {!demo && <button className="btn btn-quiet !p-2 hover:!text-danger" onClick={() => void remove(h.id)} aria-label="Delete"><Trash2 size={16} /></button>}
                    </div></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {rows.map(h => (
                <li key={h.id}><button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => void open(h)}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: levelStyle[h.threat_level].hex }} />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm">{h.subject || '(no subject)'}</div><div className="mt-0.5 font-mono text-[11px] text-faint">{new Date(h.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} · {h.threat_level}</div></div>
                  <span className={`font-mono text-sm ${h.classification === 'Potential Phishing' ? 'text-danger' : 'text-safe'}`}>{h.score.toFixed(0)}</span>
                </button></li>
              ))}
            </ul>
          </>)}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.subject || 'Analysis report'} wide>
        {detail?.result ? <AnalysisResults r={detail.result} meta={{ subject: detail.subject, sender: detail.sender }} onReset={() => setDetail(null)} /> : detail && (
          <div className="space-y-4 text-sm">
            <DemoBadge label="Demo record" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Classification', detail.classification], ['Score', detail.score.toFixed(1)], ['Threat level', detail.threat_level], ['Warnings', String(detail.warning_count)]].map(([k, v]) => <div key={k} className="rounded-xl border border-line bg-ink/40 p-3"><div className="text-xs text-faint">{k}</div><div className="mt-1">{v}</div></div>)}
            </div>
            <div className="rounded-xl border border-line bg-ink/40 p-4"><div className="font-mono text-xs text-faint">{detail.sender}</div><p className="mt-2 text-dim">{detail.preview}</p></div>
            <p className="text-xs text-faint">Demo records carry a summary only. Real saved analyses open the full report here.</p>
          </div>
        )}
      </Modal>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear all history?">
        <p className="text-sm text-dim">This permanently deletes every saved analysis on this server. It can’t be undone.</p>
        <div className="mt-5 flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button><button className="btn bg-danger font-medium text-ink hover:bg-danger/90" onClick={() => void clearAll()}><Trash2 size={15} />Delete everything</button></div>
      </Modal>
    </div>
  )
}
