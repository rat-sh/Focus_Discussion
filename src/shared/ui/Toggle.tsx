import { cx } from '../lib/cx'

interface Props { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }
export function Toggle({ checked, onChange, label, disabled }: Props) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-14 shrink-0 items-center justify-end disabled:opacity-45 md:h-6 md:w-11">
      <span className={cx('relative block h-6 w-11 rounded-full border transition-colors', checked ? 'border-accent bg-accent' : 'border-line bg-raised')}>
        <span className={cx('absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all', checked ? 'left-5.5' : 'left-0.5')} />
      </span>
    </button>
  )
}
