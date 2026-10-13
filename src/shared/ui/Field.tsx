import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

const CONTROL = 'w-full rounded-ui border border-line bg-raised px-3 text-base md:text-sm text-fg placeholder:text-muted focus:border-accent focus-visible:outline-none disabled:opacity-50'

interface FieldProps { label: string; hint?: string; error?: string | null; children: (id: string) => ReactNode; className?: string }
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted">{label}</label>
      {children(id)}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, 'h-11 md:h-9', className)} {...rest} />
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(CONTROL, 'h-11 md:h-9', className)} {...rest}>{children}</select>
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(CONTROL, 'py-2', className)} {...rest} />
}
