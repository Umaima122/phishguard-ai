import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BackendPill, Logo } from './ui'

export const NAV = [
  { to: '/analyze', label: 'Analyze Email' },
  { to: '/url-inspector', label: 'URL Inspector' },
  { to: '/dashboard', label: 'Threat Intelligence' },
  { to: '/history', label: 'History' },
  { to: '/awareness', label: 'Awareness' },
  { to: '/how-it-works', label: 'How it works' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])

  return (
    <header className={`sticky top-0 z-50 transition-colors duration-300 ${scrolled || open ? 'border-b border-line bg-ink/80 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <Logo />
          <span className="font-display text-[17px] font-semibold tracking-tight">PhishGuard<span className="text-cyan"> AI</span></span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `relative rounded-lg px-3 py-2 text-[13.5px] transition ${isActive ? 'text-fg' : 'text-dim hover:text-fg'}`}>
              {({ isActive }) => (<>
                {n.label}
                {isActive && <motion.span layoutId="nav-ind" className="absolute inset-x-3 -bottom-[13px] h-px bg-cyan shadow-[0_0_12px_#00E5FF]" />}
              </>)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <div className="hidden sm:block"><BackendPill /></div>
          <Link to="/analyze" className="btn btn-primary hidden !py-2 md:inline-flex">Get Started</Link>
          <button className="btn btn-ghost !p-2 lg:hidden" onClick={() => setOpen(o => !o)} aria-label="Menu" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line lg:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {[{ to: '/', label: 'Home' }, ...NAV].map((n, i) => (
                <motion.div key={n.to} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <NavLink to={n.to} end className={({ isActive }) => `flex items-center justify-between rounded-xl px-4 py-3 text-[15px] ${isActive ? 'bg-white/[0.05] text-fg' : 'text-dim'}`}>
                    {n.label}
                  </NavLink>
                </motion.div>
              ))}
              <div className="mt-3 flex items-center justify-between px-1"><BackendPill /><Link to="/analyze" className="btn btn-primary">Analyze an Email</Link></div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5"><Logo size={26} /><span className="font-display font-semibold">PhishGuard AI</span></div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-dim">Think before you click. Let AI investigate. An educational phishing-detection platform built with Python, scikit-learn and Sentence-BERT.</p>
          <p className="mt-4 text-xs text-faint">Automated analysis can be wrong. Use it alongside your own judgement and your organisation's reporting process.</p>
        </div>
        <div>
          <div className="eyebrow mb-3 !text-faint">Platform</div>
          <ul className="space-y-2 text-sm text-dim">{NAV.slice(0, 4).map(n => <li key={n.to}><Link className="hover:text-fg" to={n.to}>{n.label}</Link></li>)}</ul>
        </div>
        <div>
          <div className="eyebrow mb-3 !text-faint">Learn</div>
          <ul className="space-y-2 text-sm text-dim">
            <li><Link className="hover:text-fg" to="/awareness">Awareness Center</Link></li>
            <li><Link className="hover:text-fg" to="/awareness#quiz">Phishing quiz</Link></li>
            <li><Link className="hover:text-fg" to="/how-it-works">How the model works</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 font-mono text-[11px] text-faint sm:flex-row sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} PhishGuard AI · Developed by Umaima Qureshi</span>
          <span>FastAPI · scikit-learn · sentence-transformers · React</span>
        </div>
      </div>
    </footer>
  )
}
