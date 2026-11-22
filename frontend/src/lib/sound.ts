/**
 * Procedural soundtrack, generated live with the Web Audio API (no audio files).
 * Ambient: slow evolving synth pad + soft chime sparkles through a generated reverb.
 * SFX: scan start sweep, verdict chimes. Off by default; browsers need a user click.
 */
import { useSyncExternalStore } from 'react'

type Sfx = 'scan' | 'safe' | 'alert' | 'tick'

const KEY = 'pg-sound'
let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambientBus: GainNode | null = null
let reverb: ConvolverNode | null = null
let running = false
let timers: number[] = []
let voices: { osc: OscillatorNode[]; stop: () => void } | null = null
const listeners = new Set<() => void>()

function readPref() { try { return localStorage.getItem(KEY) === 'on' } catch { return false } }
let enabled = false // always starts off until the user clicks (autoplay rules)

function emit() { listeners.forEach(l => l()) }

function impulse(c: AudioContext, seconds = 4.5, decay = 2.6) {
  const len = c.sampleRate * seconds, buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

function setup() {
  if (ctx) return ctx
  ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  master = ctx.createGain(); master.gain.value = 0
  master.connect(ctx.destination)
  reverb = ctx.createConvolver(); reverb.buffer = impulse(ctx)
  const wet = ctx.createGain(); wet.gain.value = 0.55
  reverb.connect(wet).connect(master)
  ambientBus = ctx.createGain(); ambientBus.gain.value = 0.9
  ambientBus.connect(master); ambientBus.connect(reverb)
  return ctx
}

// Am9 → Fmaj7 → Cmaj9 → Em7, low and wide
const CHORDS = [[110, 164.81, 246.94, 261.63], [87.31, 130.81, 220, 329.63], [130.81, 196, 246.94, 293.66], [82.41, 123.47, 196, 293.66]]
const BELLS = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1174.66]

function startPad() {
  const c = ctx!, bus = ambientBus!
  const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600; filter.Q.value = 0.8
  const lfo = c.createOscillator(); lfo.frequency.value = 0.05
  const lfoAmt = c.createGain(); lfoAmt.gain.value = 380
  lfo.connect(lfoAmt).connect(filter.frequency); lfo.start()
  const padGain = c.createGain(); padGain.gain.value = 0.0
  padGain.gain.linearRampToValueAtTime(0.11, c.currentTime + 4)
  filter.connect(padGain).connect(bus)
  const oscs: OscillatorNode[] = []
  CHORDS[0].forEach((f, i) => {
    for (const det of [-7, 7]) {
      const o = c.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth'
      o.frequency.value = f; o.detune.value = det
      const g = c.createGain(); g.gain.value = i === 0 ? 0.5 : 0.16
      o.connect(g).connect(filter); o.start(); oscs.push(o)
    }
  })
  let step = 0
  const change = () => {
    step = (step + 1) % CHORDS.length
    const t = c.currentTime
    oscs.forEach((o, k) => o.frequency.setTargetAtTime(CHORDS[step][Math.floor(k / 2)], t, 2.2))
  }
  timers.push(window.setInterval(change, 9000))
  voices = { osc: oscs, stop: () => { const t = c.currentTime; padGain.gain.setTargetAtTime(0, t, 0.8); setTimeout(() => { oscs.forEach(o => o.stop()); lfo.stop() }, 3000) } }
}

function bell(freq: number, when = 0, gain = 0.05, dest?: AudioNode) {
  const c = ctx!, t = c.currentTime + when
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8)
  const g2 = c.createGain(); g2.gain.value = 0.25
  o.connect(g); o2.connect(g2).connect(g); g.connect(dest ?? ambientBus!)
  o.start(t); o2.start(t); o.stop(t + 3); o2.stop(t + 3)
}

function sparkle() {
  if (!running) return
  bell(BELLS[Math.floor(Math.random() * BELLS.length)], 0, 0.028)
  timers.push(window.setTimeout(sparkle, 3500 + Math.random() * 4500))
}

async function start() {
  const c = setup()
  if (c.state === 'suspended') await c.resume()
  running = true
  master!.gain.cancelScheduledValues(c.currentTime)
  master!.gain.setTargetAtTime(0.8, c.currentTime, 0.8)
  startPad()
  timers.push(window.setTimeout(sparkle, 2500))
}

function stop() {
  running = false
  timers.forEach(t => { clearInterval(t); clearTimeout(t) }); timers = []
  if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
  voices?.stop(); voices = null
}

export async function setSound(on: boolean) {
  enabled = on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ }
  if (on) await start(); else stop()
  emit()
}

export function sfx(kind: Sfx) {
  if (!enabled || !ctx || !master) return
  const c = ctx, t = c.currentTime
  if (kind === 'scan') {
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(900, t + 1.6)
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8)
    o.connect(g); g.connect(master); g.connect(reverb!); o.start(t); o.stop(t + 1.9)
  } else if (kind === 'safe') {
    [659.25, 987.77, 1318.5].forEach((f, i) => bell(f, i * 0.12, 0.07, master!))
  } else if (kind === 'alert') {
    [[440, 0], [349.23, 0.18], [293.66, 0.36]].forEach(([f, d]) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f
      const g = c.createGain(); g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.09, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9)
      o.connect(g); g.connect(master!); g.connect(reverb!); o.start(t + d); o.stop(t + d + 1)
    })
  } else if (kind === 'tick') {
    bell(1567.98, 0, 0.02, master)
  }
}

export function useSound() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb) }, () => enabled)
}

/** True if the user turned sound on last visit (we still need a click to start). */
export const soundWasOn = readPref
