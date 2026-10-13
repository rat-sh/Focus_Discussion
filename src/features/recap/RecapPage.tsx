import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import { STATE_META, STATE_ORDER, formatMinutes, summarizeRecord } from '@/domain/focus'
import { Async, EmptyState } from '@/shared/ui/Feedback'
import { Panel, PanelHeader } from '@/shared/ui/Panel'
import { StateLegend } from '@/shared/ui/StateChip'
import { formatDay, formatTime } from '@/shared/lib/format'
import { QualityTimeline } from '../focus/QualityTimeline'
import { Clock } from 'lucide-react'

export function RecapPage() {
  const { id = '' } = useParams()
  const rec = useResource(() => repos.focus.get(id), id)
  return (
    <>
      <Link to="/stats" className="mb-3 inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-fg md:h-8"><ArrowLeft size={14} aria-hidden />Stats</Link>
      <Async res={rec}>
        {(r) => {
          if (!r) return <EmptyState icon={Clock} title="Session not found" />
          const s = summarizeRecord(r)
          const wallMin = s.elapsedSec / 60
          return (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div><h1 className="text-xl font-semibold md:text-lg">{r.title}</h1><p className="text-sm text-muted">{formatDay(r.startedAt)} · {formatTime(r.startedAt)}</p></div>
              </div>
              <Panel className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-xs text-muted">Time set</p><p className="font-mono text-xl tabular">{formatMinutes(r.plannedMin)}</p></div>
                  <div><p className="text-xs text-muted">Quality time</p><p className="font-mono text-xl tabular text-st-focus">{formatMinutes(s.qualitySec / 60)}</p></div>
                  <div><p className="text-xs text-muted">Focus score</p><p className="font-mono text-xl tabular">{s.score}%</p></div>
                </div>
                <p className="mt-3 text-sm text-muted">The clock ran for {formatMinutes(wallMin)}. {formatMinutes(s.qualitySec / 60)} of it counted.</p>
              </Panel>
              <Panel>
                <PanelHeader title="Timeline" />
                <div className="flex flex-col gap-3 p-4">
                  <QualityTimeline segments={r.segments} totalSec={Math.max(r.plannedMin * 60, s.elapsedSec)} height="h-5" />
                  <StateLegend />
                </div>
              </Panel>
              <Panel>
                <PanelHeader title="What counted" />
                <ul>{STATE_ORDER.map((st) => (
                  <li key={st} className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2 last:border-b-0">
                    <div><p className={`text-sm font-medium ${STATE_META[st].text}`}>{STATE_META[st].label}</p><p className="text-xs text-muted">{STATE_META[st].counts ? 'Counts as quality time' : st === 'resting' ? `Free up to ${r.restBudgetPct}% of your time` : 'Not counted'}</p></div>
                    <span className="font-mono text-sm tabular">{formatMinutes(s.bySec[st] / 60)}</span>
                  </li>
                ))}</ul>
              </Panel>
            </div>
          )
        }}
      </Async>
    </>
  )
}
