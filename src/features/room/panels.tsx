import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ChevronUp, Hand, Mic, MicOff, Send, Video, VideoOff } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { Participant } from '@/domain/types'
import { useCommands } from '@/shared/context/command'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { Async, Badge, EmptyState } from '@/shared/ui/Feedback'
import { Input } from '@/shared/ui/Field'
import { StateChip } from '@/shared/ui/StateChip'
import { cx } from '@/shared/lib/cx'
import { formatMinutes } from '@/domain/focus'
import { formatTime } from '@/shared/lib/format'
import { MusicPanel } from '../music/MusicPanel'

export function ChatPanel({ code }: { code: string }) {
  const res = useResource(() => repos.live.chat(code), code)
  const { runSlash } = useCommands()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [res.data?.length])
  const send = async () => {
    const t = text.trim()
    if (!t) return
    setText('')
    if (t.startsWith('/')) { runSlash(t); return }
    await repos.live.sendChat(code, t)
    await res.reload()
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3" role="log" aria-live="polite" aria-label="Chat messages">
        <Async res={res}>{(list) => (
          <ul className="flex flex-col gap-3">{list.map((m) => (
            <li key={m.id} className={cx('flex max-w-[85%] flex-col gap-0.5', m.mine && 'self-end items-end')}>
              <span className="text-xs text-muted">{m.mine ? 'You' : m.author} · {formatTime(m.at)}</span>
              <p className={cx('rounded-ui px-3 py-2 text-sm', m.mine ? 'bg-accent-soft' : 'bg-raised')}>{m.text}</p>
            </li>
          ))}</ul>
        )}</Async>
        <div ref={end} />
      </div>
      <form className="flex shrink-0 gap-2 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); void send() }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message, or /music link" aria-label="Chat message" autoComplete="off" enterKeyHint="send" />
        <Button type="submit" variant="primary" iconOnly label="Send" icon={Send} disabled={!text.trim()} />
      </form>
    </div>
  )
}

export function DoubtsPanel({ code }: { code: string }) {
  const res = useResource(() => repos.live.doubts(code), code)
  const [text, setText] = useState('')
  const [anon, setAnon] = useState(false)
  const add = async () => { if (!text.trim()) return; await repos.live.addDoubt(code, text.trim(), anon); setText(''); await res.reload() }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Async res={res}>{(list) => list.length === 0 ? <EmptyState icon={Hand} title="No doubts yet" text="Ask anything. Others can upvote it." /> : (
          <ul>{list.map((d) => (
            <li key={d.id} className={cx('flex gap-3 border-b border-line px-3 py-3', d.pinned && 'bg-accent-soft')}>
              <button type="button" aria-label={`Upvote. ${d.votes} votes`} onClick={async () => { await repos.live.voteDoubt(d.id); await res.reload() }}
                className="flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-ui border border-line text-muted hover:text-fg"><ChevronUp size={16} aria-hidden /><span className="font-mono text-xs tabular">{d.votes}</span></button>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2"><Badge>{d.tag}</Badge>{d.pinned && <Badge className="border-accent text-accent">Pinned</Badge>}<Badge className={d.status === 'answered' ? 'border-st-focus text-st-focus' : 'border-st-phone text-st-phone'}>{d.status === 'answered' ? 'Answered' : 'Open'}</Badge></div>
                <p className="text-sm">{d.text}</p>
                <p className="mt-1 text-xs text-muted">{d.author} · {formatTime(d.at)}</p>
              </div>
            </li>
          ))}</ul>
        )}</Async>
      </div>
      <form className="flex shrink-0 flex-col gap-2 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); void add() }}>
        <div className="flex gap-2"><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a doubt" aria-label="Ask a doubt" autoComplete="off" /><Button type="submit" variant="primary" iconOnly label="Post doubt" icon={ArrowUp} disabled={!text.trim()} /></div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted md:min-h-0"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)] md:h-4 md:w-4" checked={anon} onChange={(e) => setAnon(e.target.checked)} />Ask anonymously</label>
      </form>
    </div>
  )
}

export function PeoplePanel({ people, meId }: { people: Participant[]; meId: string }) {
  const sorted = [...people].sort((a, b) => (a.handOrder ?? 99) - (b.handOrder ?? 99) || (a.role === 'host' ? -1 : 0) - (b.role === 'host' ? -1 : 0))
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="border-b border-line px-3 py-2 text-xs text-muted">{people.length} in this room</p>
      <ul>{sorted.map((p) => (
        <li key={p.id} className="flex min-h-14 items-center gap-3 border-b border-line px-3 py-2">
          <Avatar name={p.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{p.name}{p.id === meId ? ' (You)' : ''}</p>
            <p className="flex items-center gap-2 text-xs text-muted">{p.role === 'host' ? 'Host' : p.role === 'presenter' ? 'Presenter' : 'Participant'}{p.handOrder !== null && <span className="inline-flex items-center gap-1 text-st-phone"><Hand size={12} aria-hidden />#{p.handOrder}</span>}</p>
          </div>
          {p.focus && <StateChip state={p.focus} compact className="hidden sm:inline-flex" />}
          {p.mic ? <Mic size={14} className="text-muted" aria-label="Mic on" /> : <MicOff size={14} className="text-danger" aria-label="Muted" />}
          {p.cam ? <Video size={14} className="text-muted" aria-label="Camera on" /> : <VideoOff size={14} className="text-muted" aria-label="Camera off" />}
        </li>
      ))}</ul>
    </div>
  )
}

export function RanksPanel({ code }: { code: string }) {
  const res = useResource(() => repos.live.ranks(code), code)
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="border-b border-line px-3 py-2 text-xs text-muted">This week, by quality time. Rest, phone and away time do not count.</p>
      <Async res={res}>{(rows) => (
        <ol>{rows.map((r, i) => (
          <li key={r.userId} className={cx('flex min-h-14 items-center gap-3 border-b border-line px-3 py-2', r.mine && 'bg-accent-soft')}>
            <span className="w-5 text-center font-mono text-sm tabular text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{r.name}{r.mine ? ' (You)' : ''}</span>
            <span className="font-mono text-sm tabular">{formatMinutes(r.qualityMin)}</span>
            <span className="w-10 text-right font-mono text-xs tabular text-muted">{r.score}%</span>
          </li>
        ))}</ol>
      )}</Async>
    </div>
  )
}


export const MusicTab = () => <div className="min-h-0 flex-1 overflow-y-auto"><MusicPanel /></div>
