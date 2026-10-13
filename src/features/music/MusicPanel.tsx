import { useState } from 'react'
import { ExternalLink, Pause, Play, Square, Volume2 } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Field'
import { Kbd } from '@/shared/ui/Feedback'
import { hostOf } from '@/shared/lib/format'
import { QUICK_PICKS, searchUrl, useMusic } from './MusicProvider'

/** Personal study music. Not shared with the room. */
export function MusicPanel({ className }: { className?: string }) {
  const m = useMusic()
  const [link, setLink] = useState('')
  return (
    <div className={className}>
      <div className="flex flex-col gap-4 p-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (link.trim() && m.play(link)) setLink('') }}>
          <Input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube link" aria-label="Music link" autoComplete="off" />
          <Button type="submit" variant="primary" disabled={!link.trim()}>Play</Button>
        </form>
        {m.src ? (
          <div className="flex flex-col gap-3 rounded-ui border border-line bg-raised p-3">
            <p className="truncate text-sm">Now playing · <span className="text-muted">{hostOf(m.source)}</span></p>
            <div className="flex items-center gap-2">
              <Button iconOnly label={m.playing ? 'Pause music' : 'Resume music'} icon={m.playing ? Pause : Play} onClick={m.toggle} />
              <Button iconOnly label="Stop music" icon={Square} onClick={m.stop} />
              <Volume2 size={16} className="ml-1 shrink-0 text-muted" aria-hidden />
              <input type="range" min={0} max={100} value={m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} aria-label="Music volume" className="h-11 min-w-0 flex-1 accent-[var(--accent)] md:h-6" />
            </div>
          </div>
        ) : <p className="text-sm text-muted">Nothing playing. Paste a link above, or pick a sound below to find one.</p>}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Quick picks (opens YouTube search)</span>
          <div className="flex flex-wrap gap-2">{QUICK_PICKS.map((p) => (
            <a key={p.id} href={searchUrl(p.query)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-ui border border-line px-3 text-sm text-muted hover:text-fg md:h-8">{p.label}<ExternalLink size={12} aria-hidden /></a>
          ))}</div>
        </div>
        <p className="text-xs text-muted">Shortcut: type <Kbd>/music link</Kbd> or <Kbd>/stop</Kbd> in the command palette or room chat.</p>
      </div>
    </div>
  )
}
