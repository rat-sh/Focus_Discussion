import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import type { LiveChatMessage } from './liveApi'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Field'

export function LiveChatPanel({
  messages,
  currentUserId,
  connected,
  error,
  onSend,
}: {
  messages: LiveChatMessage[]
  currentUserId: string
  connected: boolean
  error: string | null
  onSend: (text: string) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  const send = async () => {
    const body = text.trim()
    if (!body || sending || !connected) return
    setSending(true)
    setSendError(null)
    try {
      await onSend(body)
      setText('')
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && <p role="alert" className="border-b border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      {sendError && <p role="alert" className="border-b border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{sendError}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto p-3" role="log" aria-live="polite" aria-label="Room chat messages">
        {messages.length === 0 ? <p className="text-sm text-muted">No messages yet. Start the conversation.</p> : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => {
              const mine = message.userId === currentUserId
              return (
                <li key={message.id} className={`flex max-w-[90%] flex-col gap-0.5 ${mine ? 'self-end items-end' : ''}`}>
                  <span className="text-xs text-muted">{mine ? 'You' : message.author} · {new Date(message.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <p className={`break-words rounded-ui px-3 py-2 text-sm ${mine ? 'bg-accent-soft' : 'bg-raised'}`}>{message.text}</p>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={end} />
      </div>
      <form className="flex shrink-0 gap-2 border-t border-line p-2" onSubmit={(event) => { event.preventDefault(); void send() }}>
        <Input value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder={connected ? 'Message the room' : 'Reconnecting…'} aria-label="Room chat message" autoComplete="off" />
        <Button type="submit" variant="primary" iconOnly label="Send message" icon={Send} disabled={!text.trim() || sending || !connected} />
      </form>
    </div>
  )
}
