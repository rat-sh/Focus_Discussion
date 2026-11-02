import { useEffect, useRef } from 'react'
import { MonitorUp } from 'lucide-react'
import type { LiveScreenShare } from './useLiveRoomConnection'

export function ScreenShareStage({ screenShare }: { screenShare: LiveScreenShare }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { participant, track } = screenShare

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    track.attach(video)
    return () => { track.detach(video) }
  }, [track])

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="min-h-0 w-full flex-1 object-contain" />
      <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-3 py-2 text-sm">
        <MonitorUp size={16} aria-hidden />
        <span className="truncate">Screen shared by {participant.name || participant.identity}</span>
      </div>
    </div>
  )
}
