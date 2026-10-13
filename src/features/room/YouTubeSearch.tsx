import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Field'
import { isYouTubeSearchEnabled, searchYouTube, type YouTubeSearchResult } from './youtubeApi'

export function YouTubeSearch({ disabled, onSelect }: { disabled: boolean; onSelect: (videoId: string) => Promise<void> }) {
  const [enabled, setEnabled] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<YouTubeSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void isYouTubeSearchEnabled()
      .then((available) => { if (active) setEnabled(available) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not check YouTube search') })
    return () => { active = false }
  }, [])

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = query.trim()
    if (!value || loading) return
    setLoading(true)
    setError(null)
    try {
      setItems(await searchYouTube(value))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'YouTube search failed')
    } finally {
      setLoading(false)
    }
  }

  if (!enabled) return error ? <p role="alert" className="text-xs text-danger">{error}</p> : null

  const select = async (item: YouTubeSearchResult) => {
    setLoading(true)
    setError(null)
    try {
      await onSelect(item.videoId)
      setItems([])
      setQuery('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not set the shared video')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="shrink-0 border-b border-line pb-3" aria-label="Search YouTube">
      <form className="flex gap-2" onSubmit={(event) => { void search(event) }}>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Search YouTube" aria-label="Search YouTube videos" autoComplete="off" />
        <Button type="submit" variant="secondary" icon={Search} disabled={disabled || loading || !query.trim()}>{loading ? 'Searching…' : 'Search'}</Button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      {items.length > 0 && (
        <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto" aria-label="YouTube search results">
          {items.map((item) => (
            <li key={item.videoId}>
              <button type="button" disabled={disabled || loading} onClick={() => { void select(item) }} className="flex min-h-14 w-full items-center gap-2 rounded-ui p-1.5 text-left hover:bg-raised disabled:opacity-50">
                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-10 w-16 shrink-0 rounded object-cover" />}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm">{item.title}</span><span className="block truncate text-xs text-muted">{item.channelTitle}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
