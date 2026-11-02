import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Lock, Plus } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import { formatMinutes } from '@/domain/focus'
import { useProfile } from '@/shared/context/profile'
import { Avatar } from '@/shared/ui/Avatar'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Async, Badge } from '@/shared/ui/Feedback'
import { Input } from '@/shared/ui/Field'
import { Panel, PanelHeader } from '@/shared/ui/Panel'
import { StateDot } from '@/shared/ui/StateChip'
import { formatDay, formatTime, timeAgo } from '@/shared/lib/format'
import { CreateRoomDialog } from '../rooms/CreateRoomDialog'
import { QualityBars } from '../stats/QualityBars'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 md:p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-xl font-semibold tabular">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

export function HomePage() {
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState('')
  const stats = useResource(() => repos.stats.weekly())
  const schedule = useResource(() => repos.schedule.upcoming())
  const rooms = useResource(() => repos.rooms.listMine())
  const friends = useResource(() => repos.friends.list())
  const firstName = profile?.name.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-lg">Hi{firstName ? `, ${firstName}` : ''}</h1>
        <Async res={schedule} skeleton={<p className="text-sm text-muted">&nbsp;</p>}>
          {(s) => <p className="text-sm text-muted">{s[0] ? `Next: ${s[0].title}, ${timeAgo(s[0].startsAt)}` : 'No sessions scheduled.'}</p>}
        </Async>
      </div>

      <Panel>
        <div className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center md:p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto_1fr]">
            <Button variant="primary" size="lg" icon={Plus} onClick={() => setCreating(true)}>Start a room</Button>
            <Button size="lg" icon={Lock} onClick={() => navigate('/focus')}>Focus Lock</Button>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate('/join', { state: { code } }) }}>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Room code or link" aria-label="Room code" className="uppercase placeholder:normal-case" />
              <Button type="submit" size="lg" disabled={!code.trim()}>Join with code</Button>
            </form>
          </div>
        </div>
      </Panel>

      <Async res={stats}>
        {(s) => {
          const focused = s.days.reduce((a, d) => a + d.focusedMin, 0)
          return (
            <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-ui border border-line bg-surface md:grid-cols-4 md:divide-y-0">
              <Stat label="Quality time, this week" value={formatMinutes(focused)} sub={`of ${formatMinutes(s.goalMin)} goal`} />
              <Stat label="Focus score" value={`${s.scoreAvg}%`} sub="Focused ÷ active time" />
              <Stat label="Streak" value={`${s.streakDays} days`} />
              <Stat label="Doubts answered" value={String(s.doubtsAnswered)} />
            </div>
          )
        }}
      </Async>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel>
          <PanelHeader title="Upcoming sessions" action={<ButtonLink to="/schedule" variant="ghost" size="sm">All</ButtonLink>} />
          <Async res={schedule}>
            {(list) => list.length === 0 ? <p className="p-4 text-sm text-muted">Nothing scheduled yet.</p> : (
              <ul>
                {list.slice(0, 3).map((s) => (
                  <li key={s.id} className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="truncate text-xs text-muted">{formatDay(s.startsAt)} · {formatTime(s.startsAt)} · {s.going} going</p>
                    </div>
                    <ButtonLink to={`/j/${s.roomCode}`} size="sm" variant="secondary">Join</ButtonLink>
                  </li>
                ))}
              </ul>
            )}
          </Async>
        </Panel>
        <Panel>
          <PanelHeader title="This week" subtitle="Minutes by quality state" action={<ButtonLink to="/stats" variant="ghost" size="sm">Details</ButtonLink>} />
          <div className="p-4"><Async res={stats}>{(s) => <QualityBars days={s.days} height={120} />}</Async></div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel>
          <PanelHeader title="Recent rooms" action={<ButtonLink to="/rooms" variant="ghost" size="sm">My rooms</ButtonLink>} />
          <Async res={rooms}>
            {(list) => list.length === 0 ? <p className="p-4 text-sm text-muted">No rooms yet. Start one or join with a code.</p> : (
              <ul>
                {list
                  .filter((r) => r.lastSessionAt !== null)
                  .sort((a, b) => (b.lastSessionAt ?? '').localeCompare(a.lastSessionAt ?? ''))
                  .slice(0, 3)
                  .map((r) => (
                  <li key={r.id}>
                    <Link to={`/rooms/${r.id}`} className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0 hover:bg-raised">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-muted">{r.memberCount} members · {r.lastSessionAt ? `last ${timeAgo(r.lastSessionAt)}` : 'no sessions yet'}</p>
                      </div>
                      <Badge>{r.topic}</Badge>
                      <ArrowRight size={14} className="text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Async>
        </Panel>
        <Panel>
          <PanelHeader title="Friends studying" action={<ButtonLink to="/friends" variant="ghost" size="sm">All</ButtonLink>} />
          <Async res={friends}>
            {(list) => {
              const live = list.filter((f) => f.presence !== 'offline').slice(0, 4)
              return live.length === 0 ? <p className="p-4 text-sm text-muted">No friends online right now.</p> : (
                <ul>{live.map((f) => (
                  <li key={f.id} className="flex min-h-12 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                    <Avatar name={f.name} url={f.avatarUrl} size={28} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm">{f.name}</p><p className="truncate text-xs text-muted">{f.roomName ?? 'Online'}</p></div>
                    {f.focus && <StateDot state={f.focus} />}
                  </li>
                ))}</ul>
              )
            }}
          </Async>
        </Panel>
      </div>
      <CreateRoomDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
