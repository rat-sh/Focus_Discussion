import { useState } from 'react'
import { Presentation } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { FocusLink } from '@/domain/types'
import { Async, EmptyState } from '@/shared/ui/Feedback'
import { cx } from '@/shared/lib/cx'
import { LinkViewer } from '../focus/LinkViewer'

/** Shows one of the room's materials as the main content. */
export function MaterialStage({ roomId }: { roomId?: string } = {}) {
  const res = useResource(() => repos.materials.list(roomId), roomId)
  const [id, setId] = useState<string | null>(null)
  return (
    <Async res={res}>
      {(all) => {
        const list = all.filter((m) => m.scope === 'room' || (!roomId && m.kind === 'practice'))
        const current = list.find((m) => m.id === id) ?? list[0]
        if (!current) return <EmptyState icon={Presentation} title="No material shared" text="Any room member can share a PDF or link with this room from Study materials." />
        const link: FocusLink = { id: current.id, kind: 'material', label: current.title, url: current.url, host: current.host }
        return (
          <div className="flex h-full min-h-0 flex-col md:flex-row">
            <ul className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
              {list.map((m) => (
                <li key={m.id} className="shrink-0"><button type="button" onClick={() => setId(m.id)} aria-current={m.id === current.id ? 'true' : undefined}
                  className={cx('block min-h-11 w-full max-w-56 truncate rounded-ui px-3 text-left text-sm md:min-h-9', m.id === current.id ? 'bg-raised font-medium' : 'text-muted hover:text-fg')}>{m.title}</button></li>
              ))}
            </ul>
            <div className="min-h-0 flex-1"><LinkViewer link={link} /></div>
          </div>
        )
      }}
    </Async>
  )
}
