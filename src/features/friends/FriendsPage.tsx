import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Clock, Link2, Search, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { Friend, PersonSearchHit, RelationState } from '@/domain/types'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { Async, EmptyState } from '@/shared/ui/Feedback'
import { Input } from '@/shared/ui/Field'
import { Panel, PageHeader } from '@/shared/ui/Panel'
import { StateChip } from '@/shared/ui/StateChip'
import { Tabs } from '@/shared/ui/Tabs'
import { useToast } from '@/shared/ui/Toast'
import { cx } from '@/shared/lib/cx'
import { timeAgo } from '@/shared/lib/format'
import { useProfile } from '@/shared/context/profile'

type Tab = 'friends' | 'requests' | 'find'

function Person({ name, url, sub, presence, children }: { name: string; url: string | null; sub: React.ReactNode; presence?: Friend['presence']; children?: React.ReactNode }) {
  return (
    <li className="flex min-h-16 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
      <span className="relative">
        <Avatar name={name} url={url} size={36} />
        {presence && <span aria-hidden className={cx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface', presence === 'offline' ? 'bg-st-idle' : 'bg-st-focus')} />}
      </span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name}</p><div className="text-xs text-muted">{sub}</div></div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  )
}

export function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends')
  const friends = useResource(() => repos.friends.list())
  const requests = useResource(() => repos.friends.requests())
  const toast = useToast()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const incoming = requests.data?.filter((r) => r.direction === 'incoming') ?? []
  const outgoing = requests.data?.filter((r) => r.direction === 'outgoing') ?? []

  const respond = async (id: string, accept: boolean) => {
    await repos.friends.respond(id, accept)
    await Promise.all([requests.reload(), friends.reload()])
    toast(accept ? 'Friend added' : 'Request declined')
  }
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(new URL(`/add/${profile?.handle ?? 'me'}`, window.location.origin).toString()); toast('Your friend link is copied. Paste it in WhatsApp.') } catch { toast('Copy is blocked by the browser', 'error') }
  }

  return (
    <>
      <PageHeader title="Friends" subtitle="See who is studying, invite them to a room, or add someone new."
        actions={<Button icon={Link2} onClick={() => void copyInvite()}>Copy my friend link</Button>} />
      <Tabs label="Friends sections" value={tab} onChange={setTab} className="mb-4"
        items={[{ id: 'friends', label: 'Friends', icon: Users, badge: friends.data?.length }, { id: 'requests', label: 'Requests', badge: incoming.length || undefined }, { id: 'find', label: 'Find people', icon: Search }]} />

      {tab === 'friends' && (
        <Panel>
          <Async res={friends}>
            {(list) => list.length === 0 ? <EmptyState icon={Users} title="No friends yet" text="Share your friend link in WhatsApp or search by name." action={<Button variant="primary" onClick={() => setTab('find')}>Find people</Button>} /> : (
              <ul>{[...list].sort((a, b) => Number(b.presence !== 'offline') - Number(a.presence !== 'offline')).map((f) => (
                <Person key={f.id} name={f.name} url={f.avatarUrl} presence={f.presence}
                  sub={f.presence === 'in-room' ? <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="min-w-0 truncate">In {f.roomName}</span>{f.focus && <StateChip state={f.focus} compact />}</span> : f.presence === 'online' ? 'Online' : 'Offline'}>
                  {f.presence === 'in-room' && f.roomCode && <Button size="sm" variant="primary" onClick={() => navigate(`/j/${f.roomCode}`)}>Join</Button>}
                  <Button size="sm" variant="ghost" iconOnly label={`Remove ${f.name}`} icon={UserMinus} onClick={async () => { await repos.friends.remove(f.id); await friends.reload(); toast('Friend removed') }} />
                </Person>
              ))}</ul>
            )}
          </Async>
        </Panel>
      )}

      {tab === 'requests' && (
        <div className="flex flex-col gap-4">
          <Panel>
            <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">Received · {incoming.length}</h2>
            {incoming.length === 0 ? <p className="p-4 text-sm text-muted">No new requests.</p> : (
              <ul>{incoming.map((r) => (
                <Person key={r.id} name={r.user.name} url={r.user.avatarUrl} sub={`@${r.user.handle} · ${timeAgo(r.at)}`}>
                  <Button size="sm" variant="primary" icon={Check} onClick={() => void respond(r.id, true)}>Accept</Button>
                  <Button size="sm" iconOnly label={`Decline ${r.user.name}`} icon={X} onClick={() => void respond(r.id, false)} />
                </Person>
              ))}</ul>
            )}
          </Panel>
          <Panel>
            <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">Sent · {outgoing.length}</h2>
            {outgoing.length === 0 ? <p className="p-4 text-sm text-muted">No pending requests.</p> : (
              <ul>{outgoing.map((r) => (
                <Person key={r.id} name={r.user.name} url={r.user.avatarUrl} sub={<span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden />Waiting · {timeAgo(r.at)}</span>}>
                  <Button size="sm" onClick={async () => { await repos.friends.cancel(r.id); await requests.reload(); toast('Request cancelled') }}>Cancel</Button>
                </Person>
              ))}</ul>
            )}
          </Panel>
        </div>
      )}

      {tab === 'find' && <FindPeople onChanged={async () => { await requests.reload() }} />}

    </>
  )
}

const RELATION_LABEL: Record<RelationState, string> = { none: '', friend: 'Friends', incoming: 'Sent you a request', outgoing: 'Request sent', self: 'You' }

function FindPeople({ onChanged }: { onChanged: () => Promise<void> }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<PersonSearchHit[] | null>(null)
  const toast = useToast()

  useEffect(() => {
    if (q.trim().length < 2) return
    let live = true
    const t = setTimeout(async () => { const r = await repos.friends.search(q); if (live) setHits(r) }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [q])

  const visibleHits = q.trim().length < 2 ? null : hits
  const add = async (id: string) => {
    await repos.friends.sendRequest(id)
    setHits((await repos.friends.search(q)) ?? null)
    await onChanged()
    toast('Request sent')
  }

  return (
    <Panel>
      <div className="border-b border-line p-3"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or handle" aria-label="Search people" type="search" /></div>
      {visibleHits === null ? <p className="p-4 text-sm text-muted">Type at least 2 letters.</p> : visibleHits.length === 0 ? <EmptyState icon={Search} title="No one found" text="Check the spelling or share your friend link instead." /> : (
        <ul>{visibleHits.map((h) => (
          <Person key={h.id} name={h.name} url={h.avatarUrl} sub={`@${h.handle}${h.mutualFriends ? ` · ${h.mutualFriends} mutual` : ''}`}>
            {h.relation === 'none' ? <Button size="sm" variant="primary" icon={UserPlus} onClick={() => void add(h.id)}>Add</Button> : <span className="text-xs text-muted">{RELATION_LABEL[h.relation]}</span>}
          </Person>
        ))}</ul>
      )}
    </Panel>
  )
}
