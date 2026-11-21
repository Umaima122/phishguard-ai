import { motion } from 'framer-motion'
import { Link2, Mail, ShieldAlert } from 'lucide-react'

const nodes = [[60, 70], [140, 30], [250, 60], [330, 25], [390, 110], [30, 190], [395, 230], [70, 320], [180, 360], [310, 340], [400, 330]]
const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [4, 6], [5, 7], [7, 8], [8, 9], [9, 10], [6, 10], [2, 4]]

/** Decorative, illustrative only: the values shown here are not real results. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px] select-none" aria-hidden>
      {/* network */}
      <svg viewBox="0 0 430 400" className="absolute inset-0 h-full w-full opacity-70">
        {edges.map(([a, b], i) => (
          <motion.line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="url(#edge)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.3 + i * 0.07 }} />
        ))}
        {nodes.map(([x, y], i) => (
          <motion.circle key={i} cx={x} cy={y} r={2.5} fill={i % 3 ? '#00E5FF' : '#8B5CF6'} initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 3, delay: i * 0.25, repeat: Infinity }} />
        ))}
        <defs><linearGradient id="edge" x1="0" x2="1"><stop offset="0" stopColor="#00E5FF" stopOpacity=".35" /><stop offset="1" stopColor="#8B5CF6" stopOpacity=".35" /></linearGradient></defs>
      </svg>

      {/* radar */}
      <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-cyan/15" />
        <div className="absolute inset-[14%] rounded-full border border-cyan/10" />
        <div className="absolute inset-[30%] rounded-full border border-violet/20" />
        <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-violet/25" />
        <motion.div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgb(0 229 255 / 0.22) 40deg, transparent 70deg)' }}
          animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />
        <div className="absolute inset-[42%] rounded-full bg-cyan/10 blur-xl" />
        {[[22, 30], [70, 62], [35, 75]].map(([l, t], i) => (
          <motion.span key={i} className={`absolute h-2 w-2 rounded-full ${i === 1 ? 'bg-danger' : 'bg-cyan'}`} style={{ left: `${l}%`, top: `${t}%` }}
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 5, repeat: Infinity, delay: i * 1.6 }} />
        ))}
      </div>

      {/* floating email card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: [0, -8, 0] }} transition={{ opacity: { duration: 0.6, delay: 0.3 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
        className="panel ticks absolute left-[6%] top-[16%] w-[62%] bg-deep/80 p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scan bg-gradient-to-b from-transparent via-cyan/15 to-transparent" />
        <div className="flex items-center gap-2 text-[11px] text-dim"><Mail size={13} className="text-cyan" /><span className="font-mono">security@paypa1-help.xyz</span></div>
        <div className="mt-2 text-[13px] font-medium">Your account has been suspended</div>
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full rounded-[2px] bg-white/[0.07]" /><div className="h-1.5 w-11/12 rounded-[2px] bg-danger/30" /><div className="h-1.5 w-4/6 rounded-[2px] bg-white/[0.07]" />
        </div>
        <div className="mt-3 flex items-center gap-1.5 rounded-[2px] border border-danger/30 bg-danger/10 px-2 py-1 font-mono text-[10px] text-danger"><Link2 size={11} />http://paypa1-help.xyz/verify</div>
      </motion.div>

      {/* verdict chip */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }} transition={{ opacity: { delay: 0.9 }, scale: { delay: 0.9 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
        className="panel absolute bottom-[14%] right-[4%] flex items-center gap-3 bg-deep/85 px-4 py-3">
        <div className="relative grid h-11 w-11 place-items-center">
          <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90"><circle cx="22" cy="22" r="19" fill="none" stroke="rgb(148 163 194 / .15)" strokeWidth="3" />
            <motion.circle cx="22" cy="22" r="19" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeDasharray="119.4" initial={{ strokeDashoffset: 119.4 }} animate={{ strokeDashoffset: 12 }} transition={{ delay: 1.1, duration: 1.4 }} /></svg>
          <ShieldAlert size={16} className="text-danger" />
        </div>
        <div><div className="text-[13px] font-medium text-danger">Potential Phishing</div><div className="font-mono text-[10px] text-faint">ILLUSTRATION</div></div>
      </motion.div>

      {/* particles */}
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.span key={i} className="absolute h-1 w-1 rounded-full bg-cyan/60" style={{ left: `${(i * 37) % 95}%`, top: `${(i * 53) % 90}%` }}
          animate={{ y: [0, -18, 0], opacity: [0, 0.8, 0] }} transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.5 }} />
      ))}
    </div>
  )
}
