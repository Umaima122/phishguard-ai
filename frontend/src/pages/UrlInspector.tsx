import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Globe, Link2, Lock, LockOpen, ScanSearch, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { DemoBadge, EmptyState, SectionHeader, SevBadge } from '../components/ui'
import { api } from '../lib/api'
import { inspectUrlLocal } from '../lib/demo'
import { useApp } from '../lib/store'
import type { UrlReport } from '../lib/types'

const EXAMPLES = ['http://paypa1-account-secure.xyz/login', 'https://bit.ly/3xYz9', 'http://192.168.4.20/verify', 'https://xn--pple-43d.com/id', 'https://accounts.google.com/']

export default function UrlInspector() {
  const { backend } = useApp()
  const [url, setUrl] = useState('')
  const [res, setRes] = useState<UrlReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const local = backend !== 'online'

  const run = async (u = url) => {
    if (u.trim().length < 3) { setErr('Enter a URL to inspect.'); return }
    setErr(''); setBusy(true); setUrl(u)
    try { setRes(local ? inspectUrlLocal(u) : await api.inspectUrl(u)) } catch { setRes(inspectUrlLocal(u)) } finally { setBusy(false) }
  }

  const riskText = { high: 'High-risk structure', medium: 'Some warning signs', low: 'No major structural warnings' }

  return (
    <div className="mx-auto max-w-5xl px-5 pt-10 lg:px-8">
      <SectionHeader eyebrow="URL Security Inspector" title="Inspect a link without opening it" sub="Paste any URL for static inspection. PhishGuard only reads the text of the address. It never visits, opens or fetches the link." right={local ? <DemoBadge label="Runs in browser" /> : undefined} />

      <form className="panel flex flex-col gap-3 p-3 sm:flex-row" onSubmit={e => { e.preventDefault(); void run() }}>
        <div className="relative flex-1">
          <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="field !pl-10 font-mono text-[14px]" placeholder="https://example.com/login" value={url} onChange={e => { setUrl(e.target.value); setErr('') }} spellCheck={false} autoComplete="off" />
        </div>
        <button className="btn btn-primary !px-6" disabled={busy}><ScanSearch size={17} />{busy ? 'Inspecting…' : 'Inspect'}</button>
      </form>
      <div className="mt-2 min-h-5 text-xs text-danger">{err}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
        Try:{EXAMPLES.map(e => <button key={e} onClick={() => void run(e)} className="rounded-lg border border-line px-2 py-1 font-mono text-[11px] text-dim transition hover:border-cyan/40 hover:text-cyan">{e.replace(/^https?:\/\//, '').slice(0, 26)}</button>)}
      </div>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {!res ? (
            <motion.div key="empty" className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState icon={<Globe size={22} />} title="No URL inspected yet" body="Checks include HTTPS, IP-address hosts, punycode and Unicode look-alikes, brand imitation, shorteners, deep subdomains and risky TLDs." />
            </motion.div>
          ) : (
            <motion.div key={res.url} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="panel p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${res.risk === 'high' ? 'border-danger/40 bg-danger/10 text-danger' : res.risk === 'medium' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-line-strong bg-white/[0.04] text-dim'}`}>
                    {res.risk === 'low' ? <CircleCheck size={26} /> : <ShieldAlert size={26} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><SevBadge s={res.risk} /><span className="font-display text-lg font-medium">{riskText[res.risk]}</span></div>
                    <div className="mt-1 break-all font-mono text-[13px] text-dim">{res.url}</div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[['Scheme', res.scheme || '—', res.scheme === 'https' ? <Lock size={14} className="text-safe" /> : <LockOpen size={14} className="text-warn" />], ['Host', res.host || '—', null], ['Registered domain', res.domain || '—', null]].map(([k, v, ic]) => (
                    <div key={k as string} className="rounded-xl border border-line bg-ink/40 p-3"><div className="text-xs text-faint">{k}</div><div className="mt-1 flex items-center gap-1.5 break-all font-mono text-sm">{ic}{v}</div></div>
                  ))}
                </div>
              </div>
              <div className="panel p-6">
                <h3 className="mb-4 font-display text-[15px] font-medium">Indicators <span className="ml-1 font-mono text-xs text-faint">{res.indicators.length}</span></h3>
                {res.indicators.length === 0 ? <p className="text-sm text-dim">No structural warning signs found.</p> : (
                  <ul className="space-y-3">{res.indicators.map((i, n) => (
                    <motion.li key={i.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: n * 0.05 }} className="flex gap-3 rounded-xl border border-line bg-ink/40 p-3.5">
                      <SevBadge s={i.severity} /><div><div className="text-sm">{i.label}</div><div className="mt-0.5 text-[13px] text-dim">{i.detail}</div></div>
                    </motion.li>))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-warn/25 bg-warn/[0.06] p-4 text-[13px] leading-relaxed text-dim">
                <span className="text-warn">This is an educational structure check, not a reputation service.</span> A URL with no warnings can still be malicious, and HTTPS only means the connection is encrypted. If in doubt, don’t open it. Go to the organisation’s site yourself.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
