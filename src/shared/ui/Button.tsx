import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cx } from '../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover border border-transparent font-semibold',
  secondary: 'bg-raised text-fg border border-line hover:border-muted',
  ghost: 'bg-transparent text-muted hover:text-fg hover:bg-raised border border-transparent',
  danger: 'bg-transparent text-danger border border-danger/60 hover:bg-danger/10',
}
// 44px touch target on phones, compact 32px on desktop. Padding and square sizing are mutually exclusive on purpose.
const HEIGHT: Record<Size, string> = { sm: 'h-10 md:h-7', md: 'h-11 md:h-8', lg: 'h-12 md:h-10' }
const PAD: Record<Size, string> = { sm: 'px-3 text-xs', md: 'px-3.5 text-sm', lg: 'px-5 text-base md:text-sm' }
const SQUARE: Record<Size, string> = { sm: 'w-10 md:w-7 text-xs', md: 'w-11 md:w-8 text-sm', lg: 'w-12 md:w-10 text-base md:text-sm' }

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', iconOnly = false, extra?: string) {
  return cx(
    'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-ui whitespace-nowrap transition-colors',
    'disabled:pointer-events-none disabled:opacity-45',
    VARIANT[variant], HEIGHT[size], iconOnly ? SQUARE[size] : PAD[size], extra,
  )
}

interface Common { variant?: Variant; size?: Size; icon?: LucideIcon; children?: ReactNode; className?: string }
type IconOnlyProps = { iconOnly: true; label: string }
type LabelProps = { iconOnly?: false; label?: string }

export function Button({ variant, size, icon: Icon, iconOnly, label, children, className, type = 'button', ...rest }:
  Common & (IconOnlyProps | LabelProps) & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button type={type} aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}
      className={buttonClass(variant, size, iconOnly, className)} {...rest}>
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden />}
      {!iconOnly && children}
    </button>
  )
}

export function ButtonLink({ variant, size, icon: Icon, children, className, ...rest }: Common & LinkProps) {
  return (
    <Link className={buttonClass(variant, size, false, className)} {...rest}>
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden />}
      {children}
    </Link>
  )
}
