import { safeHttpUrl } from '../lib/safeUrl'
import { avatarColor } from '../lib/avatarPalette'
import { initials } from '../lib/format'
import { cx } from '../lib/cx'

interface Props { name: string; url?: string | null; size?: number; className?: string; ringClass?: string }

export function Avatar({ name, url, size = 32, className, ringClass }: Props) {
  const safeSrc = url && (url.startsWith('data:image/') || safeHttpUrl(url) !== null) ? url : null

  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white', ringClass, className)}
      style={{ width: size, height: size, background: safeSrc ? undefined : avatarColor(name), fontSize: Math.max(12, Math.round(size * 0.38)) }}
      aria-label={name} role="img">
      {safeSrc ? <img src={safeSrc} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  )
}
