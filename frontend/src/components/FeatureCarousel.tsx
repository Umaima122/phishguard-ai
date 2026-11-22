import { motion, type PanInfo } from 'framer-motion'
import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface Feature { icon: LucideIcon; title: string; body: string; tags: string[] }

const AUTOPLAY_MS = 4200

/**
 * One card in focus, the next ones queued to the right. Cards slide right to
 * left on a timer, loop forever, and can be swiped, dragged or stepped.
 */
export function FeatureCarousel({ items }: { items: Feature[] }) {
  const n = items.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [cardW, setCardW] = useState(520)
  const wrap = useRef<HTMLDivElement>(null)
  const GAP = 20

  useLayoutEffect(() => {
    const measure = () => {
      const vw = wrap.current?.clientWidth ?? 1000
      setCardW(Math.min(540, Math.max(280, vw < 640 ? vw - 40 : vw * 0.46)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const go = useCallback((d: number) => setIndex(i => (i + d + n) % n), [n])

  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => go(1), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [index, paused, go])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1)
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1)
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onKeyDown={e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }}
      tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Platform features" className="outline-none">
      <motion.div ref={wrap} className="relative h-[300px] cursor-grab touch-pan-y active:cursor-grabbing sm:h-[280px]"
        drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} onDragEnd={onDragEnd}>
        {items.map((f, i) => {
          // slot 0 = in focus, 1..n-2 queued on the right, -1 = just left
          let slot = (i - index + n) % n
          if (slot === n - 1) slot = -1
          const hidden = slot >= 3 || slot < -1
          const x = slot * (cardW + GAP)
          return (
            <motion.article key={f.title} aria-hidden={slot !== 0}
              className="panel ticks absolute top-0 left-0 flex h-full flex-col overflow-hidden p-7 select-none"
              style={{ width: cardW }}
              initial={false}
              animate={{ x, opacity: hidden ? 0 : slot === 0 ? 1 : slot === -1 ? 0 : 0.42 - (slot - 1) * 0.14, scale: slot === 0 ? 1 : 0.96 }}
              transition={hidden ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 26, mass: 0.9 }}>
              <div className="flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-[3px] border border-cyan/25 bg-cyan/[0.07] text-cyan"><f.icon size={22} strokeWidth={1.75} /></div>
                <span className="font-display text-5xl font-semibold leading-none text-white/[0.06]">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-6 font-display text-[22px] font-medium tracking-tight">{f.title}</h3>
              <p className="mt-2.5 max-w-[46ch] text-[15px] leading-relaxed text-dim">{f.body}</p>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-5 font-mono text-[12px] text-faint">
                {f.tags.map(t => <span key={t}>{t}</span>)}
              </div>
              {slot === 0 && !paused && (
                <motion.span key={index} className="absolute bottom-0 left-0 h-[2px] bg-cyan" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }} />
              )}
            </motion.article>
          )
        })}
      </motion.div>

      <div className="mt-6 flex items-center gap-5">
        <div className="flex gap-2">
          <button className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => go(-1)} aria-label="Previous feature"><ArrowLeft size={17} /></button>
          <button className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => go(1)} aria-label="Next feature"><ArrowRight size={17} /></button>
        </div>
        <div className="flex flex-1 items-center gap-1.5">
          {items.map((f, i) => (
            <button key={f.title} onClick={() => setIndex(i)} aria-label={`Show ${f.title}`} className="group flex h-6 flex-1 items-center">
              <span className={`h-[2px] w-full transition-colors ${i === index ? 'bg-cyan' : 'bg-white/10 group-hover:bg-white/25'}`} />
            </button>
          ))}
        </div>
        <span className="font-mono text-[12px] text-faint tabular-nums">{String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
      </div>
    </div>
  )
}
