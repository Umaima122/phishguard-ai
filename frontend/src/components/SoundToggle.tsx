import { VolumeX } from 'lucide-react'
import { useEffect } from 'react'
import { setSound, soundWasOn, useSound } from '../lib/sound'

/** Speaker toggle with live equaliser bars. Resumes automatically on the first click if it was on last visit. */
export function SoundToggle({ full = false }: { full?: boolean }) {
  const on = useSound()
  useEffect(() => {
    if (!soundWasOn()) return
    const resume = () => { void setSound(true); window.removeEventListener('pointerdown', resume) }
    window.addEventListener('pointerdown', resume, { once: true })
    return () => window.removeEventListener('pointerdown', resume)
  }, [])
  return (
    <button onClick={e => { e.stopPropagation(); void setSound(!on) }} aria-pressed={on} aria-label={on ? 'Turn sound off' : 'Turn sound on'} title={on ? 'Sound on' : 'Sound off'}
      className={`btn btn-ghost !h-10 ${full ? 'w-full' : '!w-10 !px-0'} relative`}>
      {on ? (
        <span className="flex h-4 items-end gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map(i => <span key={i} className="eq-bar w-[3px] rounded-full bg-[#8b8dff]" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </span>
      ) : <VolumeX size={17} className="text-dim" />}
      {full && <span>{on ? 'Sound on' : 'Sound off'}</span>}
    </button>
  )
}
