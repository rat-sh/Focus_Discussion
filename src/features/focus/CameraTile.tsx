import { useEffect, useRef } from 'react'
import { EyeOff, VideoOff } from 'lucide-react'
import type { CameraMode, QualityState } from '@/domain/types'
import { STATE_META } from '@/domain/focus'
import { Avatar } from '@/shared/ui/Avatar'
import { STATE_ICON } from '@/shared/ui/StateChip'
import { cx } from '@/shared/lib/cx'
import type { CameraStatus } from './useCamera'

interface Props {
  stream: MediaStream | null
  status: CameraStatus
  mode: CameraMode
  state: QualityState
  name: string
  avatarUrl?: string | null
  /** passport = exam-style corner tile. preview = larger tile for the setup check. */
  size?: 'passport' | 'preview'
  className?: string
}

/**
 * Exam-style camera tile. In `hidden` mode the video keeps playing off-screen so tracking continues,
 * but no pixels of the face are shown. The coloured frame always shows the current state.
 */
export function CameraTile({ stream, status, mode, state, name, avatarUrl, size = 'passport', className }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.srcObject = stream
    if (stream) void v.play().catch(() => undefined)
  }, [stream])

  const meta = STATE_META[state]
  const Icon = STATE_ICON[state]
  const showVideo = mode === 'visible' && status === 'granted'
  return (
    <div role="group" aria-label={`Camera. ${meta.label}`}
      className={cx('relative overflow-hidden rounded-ui border-[3px] bg-raised transition-colors', meta.border,
        size === 'passport' ? 'h-[96px] w-[72px] md:h-[128px] md:w-[96px]' : 'aspect-[3/4] w-40 md:w-48', className)}>
      <video ref={ref} muted playsInline autoPlay aria-hidden
        className={showVideo ? 'h-full w-full -scale-x-100 object-cover' : 'pointer-events-none absolute h-px w-px opacity-0'} />
      {!showVideo && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-1 text-center">
          {status === 'granted' ? <><Avatar name={name} url={avatarUrl} size={size === 'passport' ? 32 : 56} /><span className="flex items-center gap-1 text-xs text-muted"><EyeOff size={12} aria-hidden />Hidden</span></>
            : <><VideoOff size={20} className="text-muted" aria-hidden /><span className="text-xs text-muted">{status === 'requesting' ? 'Starting' : status === 'denied' ? 'Blocked' : 'No camera'}</span></>}
        </div>
      )}
      <span className={cx('absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-0.5 text-xs font-semibold text-black', meta.bg)}>
        <Icon size={12} strokeWidth={2.25} aria-hidden />{meta.short}
      </span>
    </div>
  )
}
