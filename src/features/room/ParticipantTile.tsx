import { useEffect, useRef } from 'react'
import { Hand, MicOff, MonitorUp } from 'lucide-react'
import type { Participant } from '@/domain/types'
import type { Track } from 'livekit-client'
import { Avatar } from '@/shared/ui/Avatar'
import { StateDot } from '@/shared/ui/StateChip'
import { cx } from '@/shared/lib/cx'

export interface TileParticipant extends Participant {
  videoTrack?: Track | null
  screenShareTrack?: Track | null
  audioTrack?: Track | null
}

interface Props { p: TileParticipant; isMe?: boolean; compact?: boolean; className?: string; onClick?: () => void }

/** Displays a live media track when present and the normal mock avatar otherwise. */
export function ParticipantTile({ p, isMe, compact, className, onClick }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoTrack = p.screenShareTrack ?? (p.cam ? p.videoTrack : null)

  useEffect(() => {
    const element = videoRef.current
    if (!element || !videoTrack) return
    videoTrack.attach(element)
    return () => { videoTrack.detach(element) }
  }, [videoTrack])

  const label = isMe ? `${p.name} (You)` : p.name
  return (
    <button type="button" onClick={onClick} aria-label={`${label}${p.mic ? '' : ', muted'}${p.handOrder ? `, hand raised ${p.handOrder}` : ''}${p.screenShareTrack ? ', sharing screen' : ''}`}
      className={cx('relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-ui border bg-raised text-left',
        p.speaking ? 'border-accent shadow-[0_0_0_1px_var(--accent)]' : 'border-line', className)}>
      {videoTrack
        ? <video ref={videoRef} autoPlay playsInline muted aria-hidden="true" className={`h-full w-full ${p.screenShareTrack ? 'object-contain' : 'object-cover'}`} />
        : <Avatar name={p.name} size={compact ? 28 : 56} />}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-black/60 px-2 py-1 text-xs text-white">
        {p.screenShareTrack && <MonitorUp size={12} aria-hidden className="shrink-0 text-accent" />}
        {!p.mic && <MicOff size={12} aria-hidden className="shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{label}{p.role === 'host' ? ' · Host' : p.role === 'presenter' ? ' · Presenter' : ''}</span>
        {p.focus && <StateDot state={p.focus} className="shrink-0" />}
      </div>
      {p.handOrder !== null && <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-st-phone px-1.5 py-0.5 text-xs font-semibold text-black"><Hand size={12} aria-hidden />{p.handOrder}</span>}
    </button>
  )
}
