import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bot, Camera, Check, Code2, Eye, EyeOff, FileText, Library, Plus, ShieldCheck, Trash2, type LucideIcon } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { CameraMode, FocusLink, FocusLinkKind, FocusPlan } from '@/domain/types'
import { useProfile } from '@/shared/context/profile'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Async } from '@/shared/ui/Feedback'
import { Field, Input } from '@/shared/ui/Field'
import { Panel, PageHeader } from '@/shared/ui/Panel'
import { Tabs } from '@/shared/ui/Tabs'
import { useToast } from '@/shared/ui/Toast'
import { cx } from '@/shared/lib/cx'
import { AI_PROVIDERS, focusKindOf, hostOf, isValidUrl, normalizeUrl } from '@/shared/lib/format'
import { safeHttpUrl } from '@/shared/lib/safeUrl'
import { formatMinutes } from '@/domain/focus'
import { usePrefs } from '../settings/prefs'
import { CameraTile } from './CameraTile'
import { peekDraftLinks, savePlan, takeDraftLinks } from './planStore'
import { useCamera } from './useCamera'

const GROUPS: { kind: FocusLinkKind; title: string; hint: string; icon: LucideIcon; placeholder: string }[] = [
  { kind: 'material', title: 'Study material', hint: 'PDF, YouTube video or any page you will read.', icon: FileText, placeholder: 'Paste a PDF, YouTube or page link' },
  { kind: 'practice', title: 'Practice', hint: 'An online practice site, or tick offline practice.', icon: Code2, placeholder: 'Paste a practice link, e.g. SQL practice' },
  { kind: 'ai', title: 'AI helper', hint: 'Only for understanding the topic. ChatGPT, Gemini, Claude or any link.', icon: Bot, placeholder: 'Paste any AI helper link' },
]
const DURATIONS = [25, 45, 60, 90, 120]
const STEPS = ['Materials', 'Timer', 'Face check'] as const

export function FocusSetupPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useProfile()
  const [prefs] = usePrefs()
  const liveMode = repos.kind === 'live'
  const stepLabels = liveMode ? ['Materials', 'Timer', 'Tracking status'] : STEPS
  const last = useResource(() => repos.focus.lastPlan())
  const library = useResource(() => repos.materials.list())

  const [step, setStep] = useState(0)
  const [links, setLinks] = useState<FocusLink[]>(() => peekDraftLinks())
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(60)
  const [restPct, setRestPct] = useState(prefs.restBudgetPct)
  const [camera, setCamera] = useState<CameraMode>(prefs.cameraMode)
  const [noTracking, setNoTracking] = useState(false)
  const [picker, setPicker] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<FocusLinkKind, string>>({ material: '', practice: '', ai: '' })
  const [linkErrors, setLinkErrors] = useState<Record<FocusLinkKind, string | null>>({ material: null, practice: null, ai: null })

  useEffect(() => { takeDraftLinks() }, [])

  const cam = useCamera(step === 2 && !noTracking)
  const cameraReady = cam.status === 'granted'

  const addLink = (kind: FocusLinkKind, raw: string, label?: string) => {
    const url = normalizeUrl(raw)
    if (!isValidUrl(url) || !safeHttpUrl(url)) {
      setLinkErrors((e) => ({ ...e, [kind]: 'Enter a valid https:// link' }))
      toast('Enter a valid https:// link', 'error')
      return false
    }
    if (links.some((l) => l.url === url)) {
      setLinkErrors((e) => ({ ...e, [kind]: 'This link is already added' }))
      toast('Already added', 'error')
      return false
    }
    setLinkErrors((e) => ({ ...e, [kind]: null }))
    setLinks((p) => [...p, { id: `l_${Date.now()}_${p.length}`, kind, label: label ?? hostOf(url), url, host: hostOf(url) }])
    return true
  }
  const addOffline = () => setLinks((p) => p.some((l) => l.url === '') ? p : [...p, { id: 'offline', kind: 'practice', label: 'Offline practice', url: '', host: 'offline' }])
  const remove = (id: string) => setLinks((p) => p.filter((l) => l.id !== id))

  const canNext = step === 0 ? links.length >= 1 : step === 1 ? minutes >= 5 && minutes <= 480 : noTracking || cameraReady
  const stepDone = [links.length >= 1, true, noTracking || cameraReady]

  const start = () => {
    const plan: FocusPlan = { title: title.trim() || 'Focus session', durationMin: minutes, restBudgetPct: restPct, camera, tracking: noTracking ? 'none' : 'camera', links }
    savePlan(plan)
    void repos.focus.savePlan(plan)
    navigate('/focus/session')
  }
  const reuse = (p: FocusPlan) => { setLinks(p.links); setTitle(p.title); setMinutes(p.durationMin) }

  const summary = useMemo(() => [
    { label: 'Links', value: links.length ? `${links.length} added` : 'None yet' },
    { label: 'Time', value: formatMinutes(minutes) },
    { label: 'Rest budget', value: `${restPct}% · ${formatMinutes((minutes * restPct) / 100)}` },
    { label: 'Tracking', value: noTracking ? 'Off (timer only)' : camera === 'visible' ? 'On-device camera' : 'On-device · blank tile' },
  ], [links.length, minutes, restPct, noTracking, camera])

  return (
    <>
      <PageHeader title="Focus Lock" subtitle="Choose what to study and set a timer. Face Lock estimates dedicated study time; it does not measure understanding." />
      <ol className="mb-4 grid grid-cols-3 gap-2" aria-label="Steps">
        {stepLabels.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined}
            className={cx('flex h-11 items-center justify-center gap-2 rounded-ui border text-sm md:h-9', i === step ? 'border-accent bg-accent-soft text-fg' : 'border-line text-muted')}>
            <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-xs', stepDone[i] && i < step ? 'bg-accent text-accent-fg' : 'bg-raised')}>{i < step ? <Check size={12} aria-hidden /> : i + 1}</span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-24 md:pb-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-4">
          {step === 0 && (
            <>
              <Async res={last}>
                {(p) => p && links.length === 0 ? (
                  <Panel className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0"><p className="text-sm font-medium">Reuse “{p.title}”</p><p className="truncate text-xs text-muted">{p.links.map((l) => l.label).join(' · ')}</p></div>
                    <Button size="sm" onClick={() => reuse(p)}>Use last plan</Button>
                  </Panel>
                ) : null}
              </Async>
              {GROUPS.map(({ kind, title: t, hint, icon: Icon, placeholder }) => {
                const items = links.filter((l) => l.kind === kind)
                return (
                  <Panel key={kind}>
                    <div className="flex items-center gap-3 border-b border-line px-4 py-3"><Icon size={18} className="text-muted" aria-hidden /><div className="min-w-0"><h2 className="text-sm font-semibold">{t}</h2><p className="text-xs text-muted">{hint}</p></div></div>
                    <div className="flex flex-col gap-3 p-4">
                      {items.length > 0 && <ul className="flex flex-col">{items.map((l) => (
                        <li key={l.id} className="flex min-h-11 items-center gap-2 border-b border-line last:border-b-0"><Check size={14} className="shrink-0 text-accent" aria-hidden /><span className="min-w-0 flex-1 truncate text-sm">{l.label}</span><span className="hidden text-xs text-muted sm:block">{l.host}</span><Button size="sm" variant="ghost" iconOnly label={`Remove ${l.label}`} icon={Trash2} onClick={() => remove(l.id)} /></li>
                      ))}</ul>}
                      {kind === 'ai' && <div className="flex flex-wrap gap-2">{AI_PROVIDERS.map((p) => <Button key={p.label} size="sm" icon={Plus} onClick={() => addLink('ai', p.url, p.label)}>{p.label}</Button>)}</div>}
                      <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); if (drafts[kind] && addLink(kind, drafts[kind])) setDrafts((d) => ({ ...d, [kind]: '' })) }}>
                        <div className="flex gap-2">
                          <Input type="url" inputMode="url" value={drafts[kind]} onChange={(e) => { setDrafts((d) => ({ ...d, [kind]: e.target.value })); if (linkErrors[kind]) setLinkErrors((errs) => ({ ...errs, [kind]: null })) }} placeholder={placeholder} aria-label={`${t} link`} autoComplete="off" />
                          <Button type="submit" disabled={!drafts[kind]}>Add</Button>
                        </div>
                        {linkErrors[kind] && <p role="alert" className="text-xs text-danger">{linkErrors[kind]}</p>}
                      </form>
                      {kind === 'practice' && <Button size="sm" className="self-start" onClick={addOffline}>Offline practice (no link)</Button>}
                    </div>
                  </Panel>
                )
              })}
              <Button icon={Library} className="self-start" onClick={() => { setPicked(new Set()); setPicker(true) }}>Add from my library</Button>
            </>
          )}

          {step === 1 && (
            <Panel className="flex flex-col gap-5 p-4">
              <Field label="What are you studying?">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. SQL joins" maxLength={60} />}</Field>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">Study time</span>
                <div className="flex flex-wrap gap-2">{DURATIONS.map((d) => <Button key={d} variant={d === minutes ? 'primary' : 'secondary'} onClick={() => setMinutes(d)}>{formatMinutes(d)}</Button>)}</div>
                <Field label="Or type minutes" className="max-w-40">{(id) => <Input id={id} type="number" inputMode="numeric" min={5} max={480} value={minutes} onChange={(e) => setMinutes(Math.min(480, Math.max(0, Number(e.target.value))))} />}</Field>
              </div>
              <Field label={`Rest budget: ${restPct}% (${formatMinutes((minutes * restPct) / 100)})`} hint="Short breaks you declare are free up to this amount. They show as pink.">
                {(id) => <input id={id} type="range" min={0} max={30} step={5} value={restPct} onChange={(e) => setRestPct(Number(e.target.value))} className="h-11 w-full accent-[var(--accent)] md:h-6" />}
              </Field>
              <p className="rounded-ui border border-line bg-raised p-3 text-sm text-muted">Sleeping or leaving the desk will not complete the clock. Only focused time counts as quality time.</p>
            </Panel>
          )}

          {step === 2 && (
            <Panel className="flex flex-col gap-5 p-4">
              <div className="flex items-start gap-3 rounded-ui border border-line bg-raised p-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden /><p className="text-sm text-muted">Face and phone checks run on this device. Video and landmarks are not uploaded or saved. Estimates can be wrong, and they are not a measure of understanding.</p></div>
              {!noTracking ? (
                <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                  <CameraTile stream={cam.stream} status={cam.status} mode={camera} state={cameraReady ? 'focused' : 'idle'} name={profile?.name ?? 'You'} avatarUrl={profile?.avatarUrl} size="preview" />
                  <div className="flex w-full flex-1 flex-col gap-3">
                    <ul className="flex flex-col gap-2 text-sm">
                      <li className="flex items-center gap-2"><span className={cx('flex h-5 w-5 items-center justify-center rounded-full', cam.status === 'granted' ? 'bg-accent text-accent-fg' : 'bg-raised text-muted')}>{cam.status === 'granted' ? <Check size={12} aria-hidden /> : <Camera size={12} aria-hidden />}</span>Camera is on</li>
                      <li className="flex items-center gap-2 text-muted"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-raised"><Eye size={12} aria-hidden /></span>Face Lock starts when you begin the session</li>
                    </ul>
                    {cam.status === 'denied' && <p role="alert" className="text-sm text-danger">Camera is blocked. Allow it in the browser address bar, then try again.</p>}
                    {cam.status === 'unavailable' && <p role="alert" className="text-sm text-danger">No camera was found on this device.</p>}
                    {(cam.status === 'denied' || cam.status === 'unavailable') && <Button className="self-start" onClick={cam.retry}>Try again</Button>}
                    <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted">Camera tile</span>
                      <Tabs variant="segment" label="Camera tile" value={camera} onChange={setCamera} items={[{ id: 'visible', label: 'Show my face', icon: Eye }, { id: 'hidden', label: 'Blank tile', icon: EyeOff }]} />
                    </div>
                  </div>
                </div>
              ) : <p className="text-sm text-muted">Without tracking this runs as a plain timer. The session is saved as “not tracked” and is left out of rankings.</p>}
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setNoTracking((v) => !v)}>{noTracking ? 'Use camera tracking instead' : 'Continue without tracking'}</Button>
            </Panel>
          )}
        </div>

        <aside className="hidden self-start lg:block"><Panel className="sticky top-0">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Your plan</h2>
          <dl className="flex flex-col">{summary.map((r) => <div key={r.label} className="flex justify-between gap-3 border-b border-line px-4 py-2.5 text-sm last:border-b-0"><dt className="text-muted">{r.label}</dt><dd className="text-right">{r.value}</dd></div>)}</dl>
        </Panel></aside>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-[57px] z-30 flex items-center justify-between gap-2 border-t border-line bg-surface px-4 py-2 md:static md:mt-4 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <Button icon={ArrowLeft} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        {step < 2 ? <Button variant="primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Next<ArrowRight size={16} aria-hidden /></Button>
          : <Button variant="primary" disabled={!canNext} onClick={start}>Start focus session</Button>}
      </div>
      {step === 0 && links.length === 0 && <p className="mt-3 text-xs text-muted">Add at least one link to continue. You can add all three kinds, or just one.</p>}

      <Dialog open={picker} onClose={() => setPicker(false)} title="Add from my library" tall
        footer={<><Button variant="ghost" onClick={() => setPicker(false)}>Cancel</Button><Button variant="primary" disabled={picked.size === 0} onClick={() => { library.data?.filter((m) => picked.has(m.id)).forEach((m) => addLink(focusKindOf(m.kind), m.url, m.title)); setPicker(false) }}>Add {picked.size || ''}</Button></>}>
        <Async res={library}>{(list) => <ul>{list.map((m) => (
          <li key={m.id}><label className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-line"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={picked.has(m.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n })} /><span className="min-w-0 flex-1 truncate text-sm">{m.title}</span><span className="text-xs text-muted">{m.host}</span></label></li>
        ))}</ul>}</Async>
      </Dialog>
    </>
  )
}
