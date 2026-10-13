import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { BookOpen, CalendarDays, ChartColumn, Command as CommandIcon, FolderOpen, House, Lock, Moon, Settings, Sun, Users, Ellipsis, type LucideIcon } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import { Avatar } from '@/shared/ui/Avatar'
import { Dialog } from '@/shared/ui/Dialog'
import { cx } from '@/shared/lib/cx'
import { useProfile } from '@/shared/context/profile'
import { useTheme } from '@/shared/context/theme'
import { useCommands } from '@/shared/context/command'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
const PRIMARY: NavItem[] = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/rooms', label: 'Rooms', icon: FolderOpen },
  { to: '/focus', label: 'Focus', icon: Lock },
  { to: '/friends', label: 'Friends', icon: Users },
]
const SECONDARY: NavItem[] = [
  { to: '/materials', label: 'Library', icon: BookOpen },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/stats', label: 'Stats', icon: ChartColumn },
]

const Brand = () => (
  <Link to="/" aria-label={BRAND.name} className="flex h-11 w-11 items-center justify-center rounded-ui bg-accent font-mono text-sm font-bold text-accent-fg md:h-9 md:w-9">{BRAND.short}</Link>
)

export function AppShell() {
  const { profile } = useProfile()
  const { theme, toggle } = useTheme()
  const { open: openPalette } = useCommands()
  const requests = useResource(() => repos.friends.requests())
  const pending = requests.data?.filter((r) => r.direction === 'incoming').length ?? 0
  const [more, setMore] = useState(false)

  const railLink = ({ isActive }: { isActive: boolean }) => cx(
    'relative flex w-14 flex-col items-center gap-1 rounded-ui py-2 text-xs transition-colors',
    isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-raised hover:text-fg')

  return (
    <div className="flex h-dvh flex-col bg-canvas md:flex-row">
      {/* Desktop rail */}
      <nav aria-label="Primary" className="hidden w-[72px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3 md:flex">
        <Brand />
        <div className="mt-3 flex flex-col gap-1">
          {[...PRIMARY, ...SECONDARY].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={railLink}>
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              {label}
              {to === '/friends' && pending > 0 && <span className="absolute right-1.5 top-1 rounded-full bg-danger px-1 text-xs leading-4 text-white">{pending}</span>}
            </NavLink>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center gap-1">
          <button type="button" onClick={openPalette} aria-label="Open command palette (Ctrl K)" title="Command palette (Ctrl K)" className="flex h-9 w-9 items-center justify-center rounded-ui text-muted hover:bg-raised hover:text-fg"><CommandIcon size={16} /></button>
          <button type="button" onClick={toggle} aria-label="Toggle theme" title="Toggle theme" className="flex h-9 w-9 items-center justify-center rounded-ui text-muted hover:bg-raised hover:text-fg">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <NavLink to="/settings" aria-label="Settings and profile" title="Settings and profile" className="mt-1 rounded-full">
            <Avatar name={profile?.name ?? 'You'} url={profile?.avatarUrl} size={32} />
          </NavLink>
        </div>
      </nav>

      {/* Phone top bar */}
      <header className="pt-safe flex h-[calc(48px+env(safe-area-inset-top,0px))] shrink-0 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <button type="button" onClick={openPalette} aria-label="Open commands" className="flex h-11 w-11 items-center justify-center rounded-ui text-muted"><CommandIcon size={18} /></button>
          <NavLink to="/settings" aria-label="Settings and profile" className="flex h-11 w-11 items-center justify-center"><Avatar name={profile?.name ?? 'You'} url={profile?.avatarUrl} size={28} /></NavLink>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {repos.kind === 'mock' && <p role="note" className="border-b border-line bg-raised px-4 py-1.5 text-center text-xs text-muted">Prototype data. Changes are not saved.</p>}
        <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-8 md:py-6"><Outlet /></div>
      </main>

      {/* Phone bottom tabs */}
      <nav aria-label="Primary" className="pb-safe grid shrink-0 grid-cols-5 border-t border-line bg-surface md:hidden">
        {PRIMARY.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('relative flex h-14 flex-col items-center justify-center gap-0.5 text-xs', isActive ? 'text-accent' : 'text-muted')}>
            <Icon size={20} strokeWidth={1.75} aria-hidden />{label}
            {to === '/friends' && pending > 0 && <span className="absolute right-[26%] top-1.5 rounded-full bg-danger px-1 text-xs leading-4 text-white">{pending}</span>}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore(true)} className="flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted"><Ellipsis size={20} aria-hidden />More</button>
      </nav>

      <Dialog open={more} onClose={() => setMore(false)} title="More">
        <ul className="flex flex-col">
          {[...SECONDARY, { to: '/settings', label: 'Settings and profile', icon: Settings }].map(({ to, label, icon: Icon }) => (
            <li key={to}><NavLink to={to} onClick={() => setMore(false)} className="flex h-12 items-center gap-3 border-b border-line text-sm"><Icon size={18} className="text-muted" aria-hidden />{label}</NavLink></li>
          ))}
          <li><button type="button" onClick={toggle} className="flex h-12 w-full items-center gap-3 text-sm">{theme === 'dark' ? <Sun size={18} className="text-muted" /> : <Moon size={18} className="text-muted" />}{theme === 'dark' ? 'Light theme' : 'Dark theme'}</button></li>
        </ul>
      </Dialog>
    </div>
  )
}
