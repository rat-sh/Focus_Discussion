import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import { STATE_META, STATE_ORDER, formatMinutes, summarizeRecord } from '@/domain/focus'
import type { QualityState } from '@/domain/types'
import { Async, ProgressBar } from '@/shared/ui/Feedback'
import { Panel, PageHeader, PanelHeader } from '@/shared/ui/Panel'
import { StateLegend } from '@/shared/ui/StateChip'
import { formatDay } from '@/shared/lib/format'
import { Link } from 'react-router-dom'
import { QualityBars } from './QualityBars'
import { QualityTimeline } from '../focus/QualityTimeline'

export function StatsPage() {
  const stats = useResource(() => repos.stats.weekly())
  const recent = useResource(() => repos.focus.recent())
  return (
    <>
      <PageHeader title="Stats" subtitle="Quality time counts only while you are focused. Rest, phone and away time are shown, not counted." />
      <div className="flex flex-col gap-4">
        <Panel>
          <PanelHeader title="This week" action={<span className="hidden md:block"><StateLegend /></span>} />
          <div className="flex flex-col gap-4 p-4">
            <Async res={stats}>
              {(s) => {
                const totals = s.days.reduce((a, d) => ({ focused: a.focused + d.focusedMin, resting: a.resting + d.restMin, phone: a.phone + d.phoneMin, lapse: a.lapse + d.lapseMin }), { focused: 0, resting: 0, phone: 0, lapse: 0 })
                const pct = (totals.focused / s.goalMin) * 100
                return (
                  <>
                    <QualityBars days={s.days} height={180} />
                    <div className="md:hidden"><StateLegend /></div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-sm"><span>Weekly goal</span><span className="font-mono tabular">{formatMinutes(totals.focused)} / {formatMinutes(s.goalMin)}</span></div>
                      <ProgressBar value={pct} />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {(['focused', 'resting', 'phone', 'lapse'] as QualityState[]).map((k) => (
                        <div key={k} className="rounded-ui border border-line p-3">
                          <dt className={`text-xs ${STATE_META[k].text}`}>{STATE_META[k].label}</dt>
                          <dd className="font-mono text-lg tabular">{formatMinutes(totals[k as 'focused'])}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )
              }}
            </Async>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Recent focus sessions" />
          <Async res={recent}>
            {(list) => (
              <ul>
                {list.map((r) => {
                  const sum = summarizeRecord(r)
                  return (
                    <li key={r.id}>
                      <Link to={`/recap/${r.id}`} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 hover:bg-raised">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm font-medium">{r.title}</span>
                          <span className="shrink-0 font-mono text-sm tabular">{sum.score}%</span>
                        </div>
                        <QualityTimeline segments={r.segments} totalSec={r.plannedMin * 60} />
                        <span className="text-xs text-muted">{formatDay(r.startedAt)} · {formatMinutes(sum.qualitySec / 60)} quality of {formatMinutes(r.plannedMin)} set</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Async>
        </Panel>
        <p className="text-xs text-muted">Order of states: {STATE_ORDER.map((s) => STATE_META[s].label).join(', ')}.</p>
      </div>
    </>
  )
}
