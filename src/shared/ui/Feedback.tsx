import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CircleAlert } from 'lucide-react'
import { cx } from '../lib/cx'
import { Button } from './Button'
import type { Resource } from '@/data/hooks'

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('animate-pulse rounded-ui bg-raised', className)} aria-hidden />

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Icon size={28} strokeWidth={1.5} className="text-muted" aria-hidden />
      <p className="text-sm font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** One place for loading / error / empty handling so no screen shows a blank state. */
export function Async<T>({ res, children, skeleton }: { res: Resource<T>; children: (data: T) => ReactNode; skeleton?: ReactNode }) {
  if (res.error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <CircleAlert size={24} className="text-danger" aria-hidden />
        <p className="text-sm">Something went wrong loading this.</p>
        <Button size="sm" onClick={() => void res.reload()}>Try again</Button>
      </div>
    )
  }
  if (res.data === undefined) {
    return <>{skeleton ?? <div className="flex flex-col gap-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}</>
  }
  return <>{children(res.data)}</>
}

export function ProgressBar({ value, className, barClass = 'bg-accent' }: { value: number; className?: string; barClass?: string }) {
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-raised', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full', barClass)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cx('inline-flex items-center rounded-[4px] border border-line px-1.5 py-0.5 text-xs text-muted', className)}>{children}</span>
)
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-[4px] border border-line bg-raised px-1.5 py-0.5 font-mono text-xs text-muted">{children}</kbd>
)
