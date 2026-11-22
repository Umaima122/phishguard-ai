import { useEffect, useRef } from 'react'

/**
 * Interactive 3D backdrop: a perspective wave field of points that ripples
 * under the cursor, with a slow constellation of linked nodes above the horizon.
 * Pure canvas, no dependencies. Pauses when the tab is hidden and renders a
 * single still frame when reduced motion is requested.
 */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1, raf = 0, t = 0, last = performance.now()
    const mouse = { x: 0.5, y: 0.7, sx: 0.5, sy: 0.7, active: 0, sa: 0 }
    const COLS = 70, ROWS = 42, SP = 0.5
    const nodes = Array.from({ length: 34 }, () => ({
      x: (Math.random() - 0.5) * 22, y: 1.2 + Math.random() * 5, z: 3 + Math.random() * 18,
      vx: (Math.random() - 0.5) * 0.006, vy: (Math.random() - 0.5) * 0.003, vz: (Math.random() - 0.5) * 0.006,
    }))

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Rotate (yaw, pitch) then perspective-project into screen space
    const project = (x: number, y: number, z: number, yaw: number, pitch: number) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw)
      const X = x * cy - z * sy
      let Z = x * sy + z * cy
      const cp = Math.cos(pitch), sp = Math.sin(pitch)
      const Y = y * cp - Z * sp
      Z = y * sp + Z * cp + 2.2
      if (Z < 0.15) return null
      const f = Math.min(w, 1200) * 0.62 / Z
      return { x: w / 2 + X * f, y: h * 0.46 - Y * f, z: Z, f }
    }

    const frame = (now: number) => {
      const dt = Math.min(48, now - last); last = now
      t += dt * 0.00045
      mouse.sx += (mouse.x - mouse.sx) * 0.06
      mouse.sy += (mouse.y - mouse.sy) * 0.06
      mouse.sa += (mouse.active - mouse.sa) * 0.05
      const yaw = (mouse.sx - 0.5) * 0.28
      const pitch = 0.05 + (mouse.sy - 0.5) * 0.08

      ctx.clearRect(0, 0, w, h)

      // Cursor position mapped onto the wave plane for the ripple
      const mx = (mouse.sx - 0.5) * COLS * SP * 0.55
      const mz = 2 + (1 - Math.min(1, Math.max(0, (mouse.sy - 0.46) / 0.54))) * ROWS * SP * 0.55

      for (let r = ROWS - 1; r >= 0; r--) {
        const z = r * SP + 1
        for (let c = 0; c < COLS; c++) {
          const x = (c - COLS / 2) * SP
          const dx = x - mx, dz = z - mz, d = Math.sqrt(dx * dx + dz * dz)
          const ripple = mouse.sa * 0.55 * Math.exp(-d * d / 6) * Math.sin(d * 2.4 - t * 9)
          const y = -1.9 + 0.32 * Math.sin(x * 0.42 + t * 2.2) * Math.cos(z * 0.36 + t * 1.6) + 0.18 * Math.sin((x + z) * 0.25 - t * 1.3) + ripple
          const p = project(x, y, z, yaw, pitch)
          if (!p || p.x < -10 || p.x > w + 10 || p.y > h + 10) continue
          const depth = Math.max(0, 1 - p.z / 26)
          const lift = Math.max(0, (y + 1.9) * 1.6)
          const a = Math.min(0.85, depth * (0.32 + lift * 0.5))
          const s = Math.max(0.6, p.f * 0.028)
          const violet = (c * 7 + r * 3) % 23 === 0
          ctx.fillStyle = violet ? `rgba(139,92,246,${a})` : `rgba(0,229,255,${a})`
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
        }
      }

      // Constellation above the horizon
      const pts: { x: number; y: number; a: number }[] = []
      for (const n of nodes) {
        if (!reduce) { n.x += n.vx; n.y += n.vy; n.z += n.vz }
        if (n.x < -11 || n.x > 11) n.vx *= -1
        if (n.y < 1 || n.y > 6.5) n.vy *= -1
        if (n.z < 3 || n.z > 21) n.vz *= -1
        const p = project(n.x, n.y, n.z, yaw * 1.6, pitch)
        if (p) pts.push({ x: p.x, y: p.y, a: Math.max(0.08, 1 - p.z / 24) })
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.hypot(dx, dy)
          if (d < 150) {
            ctx.strokeStyle = `rgba(0,229,255,${(1 - d / 150) * 0.16 * Math.min(pts[i].a, pts[j].a)})`
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke()
          }
        }
        ctx.fillStyle = `rgba(139,92,246,${pts[i].a * 0.7})`
        ctx.fillRect(pts[i].x - 1.5, pts[i].y - 1.5, 3, 3)
      }

      if (!reduce) raf = requestAnimationFrame(frame)
    }

    const onMove = (e: PointerEvent) => { mouse.x = e.clientX / w; mouse.y = e.clientY / h; mouse.active = 1 }
    const onLeave = () => { mouse.active = 0 }
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame) }
    }
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={ref} className="absolute inset-0" />
      {/* Keeps text readable: fades the field toward the top and edges */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,11,20,0.92) 0%, rgba(7,11,20,0.55) 38%, rgba(7,11,20,0.25) 70%, rgba(7,11,20,0.6) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(7,11,20,0.85) 100%)' }} />
    </div>
  )
}
