import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useIsDesktop } from '@/shared/hooks/useMediaQuery'
import { cx } from '@/shared/lib/cx'
import { ParticipantTile, type TileParticipant } from './ParticipantTile'

interface Common { people: TileParticipant[]; meId: string }

/** Paged grid. 20 tiles on desktop (5x4), 6 on phones (2x3). Swipe or use the arrows. */
export function GalleryView({ people, meId }: Common) {
  const desktop = useIsDesktop()
  const size = desktop ? 20 : 6
  const pages = Array.from({ length: Math.max(1, Math.ceil(people.length / size)) }, (_, i) => people.slice(i * size, (i + 1) * size))
  const [page, setPage] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => { scroller.current?.scrollTo({ left: page * (scroller.current?.clientWidth ?? 0), behavior: 'smooth' }) }, [page])

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div ref={scroller} className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth"
        onScroll={(e) => {
          // Read the page only after scrolling settles, so a smooth scroll we started ourselves is not overridden mid-way.
          const el = e.currentTarget
          clearTimeout(settle.current)
          settle.current = setTimeout(() => setPage(Math.round(el.scrollLeft / el.clientWidth)), 140)
        }}>
        {pages.map((group, i) => (
          <div key={i} className={cx('grid h-full w-full shrink-0 snap-start gap-2', desktop ? 'grid-cols-5 grid-rows-4' : 'grid-cols-2 grid-rows-3')}>
            {group.map((p) => <ParticipantTile key={p.id} p={p} isMe={p.id === meId} className="h-full w-full" />)}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="ghost" iconOnly label="Previous page" icon={ChevronLeft} disabled={page === 0} onClick={() => setPage((x) => x - 1)} />
          <span className="font-mono text-xs tabular text-muted" aria-live="polite">{page + 1} / {pages.length}</span>
          <Button size="sm" variant="ghost" iconOnly label="Next page" icon={ChevronRight} disabled={page >= pages.length - 1} onClick={() => setPage((x) => x + 1)} />
        </div>
      )}
    </div>
  )
}

/** Active speaker large, everyone else in a strip. */
export function SpeakerView({ people, meId }: Common) {
  const main = people.find((p) => p.speaking) ?? people.find((p) => p.role === 'presenter') ?? people[0]
  const rest = people.filter((p) => p.id !== main?.id)
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 md:flex-row">
      {main && <ParticipantTile p={main} isMe={main.id === meId} className="min-h-0 flex-1" />}
      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto md:w-40 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
        {rest.map((p) => <ParticipantTile key={p.id} p={p} isMe={p.id === meId} compact className="h-20 w-28 shrink-0 md:h-24 md:w-full" />)}
      </div>
    </div>
  )
}

/** Small strip shown beside content. First tiles plus a "+N" button that opens the gallery. */
export function Filmstrip({ people, meId, onMore, cols = 'row' }: Common & { onMore: () => void; cols?: 'row' | 'grid' }) {
  const shown = people.slice(0, cols === 'grid' ? 3 : 5)
  const extra = people.length - shown.length
  return (
    <div className={cx(cols === 'grid' ? 'grid grid-cols-2 gap-2' : 'no-scrollbar flex gap-2 overflow-x-auto')}>
      {shown.map((p) => <ParticipantTile key={p.id} p={p} isMe={p.id === meId} compact className={cols === 'grid' ? 'h-20' : 'h-20 w-28 shrink-0'} />)}
      {extra > 0 && <button type="button" onClick={onMore} aria-label={`Show all ${people.length} people`} className={cx('flex items-center justify-center rounded-ui border border-line bg-raised text-sm font-semibold hover:border-muted', cols === 'grid' ? 'h-20' : 'h-20 w-28 shrink-0')}>+{extra}</button>}
    </div>
  )
}
