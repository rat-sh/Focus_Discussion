import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, BookOpen, ExternalLink, FileText, Lock, Plus, Search, StickyNote, Trash2, Upload, Video, Code2, type LucideIcon } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { Material, MaterialKind } from '@/domain/types'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Async, Badge, EmptyState } from '@/shared/ui/Feedback'
import { Field, Input, Select } from '@/shared/ui/Field'
import { Panel, PageHeader } from '@/shared/ui/Panel'
import { Tabs } from '@/shared/ui/Tabs'
import { useToast } from '@/shared/ui/Toast'
import { detectMaterialKind, formatDate, hostOf, isValidUrl, normalizeUrl } from '@/shared/lib/format'
import { safeHttpUrl } from '@/shared/lib/safeUrl'
import { saveDraftLinks } from '../focus/planStore'

export const KIND_META: Record<MaterialKind, { label: string; icon: LucideIcon }> = {
  video: { label: 'Video', icon: Video }, pdf: { label: 'PDF', icon: FileText }, article: { label: 'Article', icon: BookOpen },
  practice: { label: 'Practice', icon: Code2 }, ai: { label: 'AI helper', icon: Bot }, notes: { label: 'Notes', icon: StickyNote },
}
type Filter = 'all' | MaterialKind
const FILTERS: Filter[] = ['all', 'video', 'pdf', 'practice', 'ai', 'article', 'notes']

/** Renders a safe external link only if the URL passes validation. */
function SafeExternalLink({ url, label, className }: { url: string; label: string; className: string }) {
  const safe = safeHttpUrl(url)
  if (!safe) return null
  return <a href={safe.href} target="_blank" rel="noopener noreferrer" aria-label={label} className={className}><ExternalLink size={14} aria-hidden /></a>
}

export function MaterialsPage() {
  const res = useResource(() => repos.materials.list())
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (res.data ?? []).filter((m) => (filter === 'all' || m.kind === filter) && (!n || m.title.toLowerCase().includes(n) || m.tags.some((t) => t.toLowerCase().includes(n))))
  }, [res.data, filter, q])

  const handleUseInFocus = (m: Material) => { saveDraftLinks([m]); navigate('/focus') }

  return (
    <>
      <PageHeader title="Study materials" subtitle="Videos, PDFs, practice links and AI helpers. Use any of them in Focus Lock or share them in a room."
        actions={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add material</Button>} />
      <div className="mb-3 flex flex-col gap-3">
        <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or tag" aria-label="Search materials" type="search" className="pl-9" /></div>
        <Tabs label="Material type" value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ id: f, label: f === 'all' ? 'All' : KIND_META[f].label }))} />
      </div>
      <Panel>
        <Async res={res}>
          {() => visible.length === 0 ? <EmptyState icon={BookOpen} title="Nothing here yet" text="Add a link or upload a PDF." action={<Button variant="primary" onClick={() => setAdding(true)}>Add material</Button>} /> : (
            <ul>{visible.map((m) => {
              const Icon = KIND_META[m.kind].icon
              return (
                <li key={m.id} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 md:flex-row md:items-center md:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-raised text-muted"><Icon size={18} aria-hidden /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="truncate text-xs text-muted">{m.host} · {m.scopeLabel} · {formatDate(m.addedAt)}{m.sizeKb ? ` · ${(m.sizeKb / 1024).toFixed(1)} MB` : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {m.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                    <Button size="sm" icon={Lock} onClick={() => handleUseInFocus(m)}>Use in Focus</Button>
                    <SafeExternalLink url={m.url} label={`Open ${m.title} in a new tab`} className="inline-flex h-10 w-10 items-center justify-center rounded-ui border border-line text-muted hover:text-fg md:h-7 md:w-7" />
                    <Button size="sm" iconOnly label={`Delete ${m.title}`} icon={Trash2} variant="ghost" onClick={async () => { await repos.materials.remove(m.id); await res.reload(); toast('Material removed') }} />
                  </div>
                </li>
              )
            })}</ul>
          )}
        </Async>
      </Panel>
      <AddMaterialDialog open={adding} onClose={() => setAdding(false)} onAdded={async () => { await res.reload(); toast('Material added') }} />
    </>
  )
}

function AddMaterialDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => Promise<void> }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<MaterialKind>('article')
  const [tags, setTags] = useState('')
  const [roomId, setRoomId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const rooms = useResource(() => repos.rooms.listMine(), open)
  const fileRef = useRef<HTMLInputElement>(null)
  const normalized = url.trim() ? normalizeUrl(url) : ''
  const urlSafe = normalized ? safeHttpUrl(normalized) !== null : false
  const valid = title.trim().length >= 2 && (file ? file.type === 'application/pdf' && file.size <= 25 * 1024 * 1024 : urlSafe && isValidUrl(normalized))
  const showUrlError = url.trim().length > 0 && !urlSafe

  const onUrl = (v: string) => {
    setUrl(v)
    if (isValidUrl(normalizeUrl(v))) { const n = normalizeUrl(v); setKind(detectMaterialKind(n)); if (!title) setTitle(hostOf(n)) }
  }
  const reset = () => {
    setUrl(''); setTitle(''); setTags(''); setKind('article'); setRoomId(''); setFile(null); setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }
  const submit = async () => {
    if (!valid) return
    setSubmitting(true)
    setError(null)
    try {
      await repos.materials.add({
        kind: file ? 'pdf' : kind,
        title: title.trim(),
        ...(file ? { file } : { url: normalized }),
        ...(roomId ? { roomId } : {}),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      reset(); onClose(); await onAdded()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this material')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Add study material"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid || submitting} onClick={() => void submit()}>{submitting ? 'Saving…' : 'Add'}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Link" hint="YouTube, PDF, practice site or an AI helper. We detect the type." error={showUrlError ? 'Enter a valid https:// URL' : undefined}>{(id) => <Input id={id} type="url" inputMode="url" value={url} onChange={(e) => { setFile(null); onUrl(e.target.value) }} placeholder="https://" autoComplete="off" disabled={!!file} />}</Field>
        <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as MaterialKind)}>{(Object.keys(KIND_META) as MaterialKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}</Select>}</Field>
          <Field label="Tags">{(id) => <Input id={id} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="SQL, DBMS" />}</Field>
        </div>
        <Field label="Share with" hint="Room members can open materials shared with their room.">
          {(id) => <Select id={id} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Only me</option>
            {(rooms.data ?? []).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </Select>}
        </Field>
        {rooms.error && <p role="alert" className="text-sm text-danger">Rooms could not be loaded. <button type="button" className="underline" onClick={() => void rooms.reload()}>Try again</button></p>}
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <input ref={fileRef} type="file" accept="application/pdf" className="sr-only" aria-label="Upload a PDF"
            onChange={(e) => {
              const selected = e.target.files?.[0]
              if (!selected) return
              setFile(selected); setUrl(''); setKind('pdf'); setTitle(selected.name.slice(0, 100))
              setError(selected.type !== 'application/pdf' ? 'Choose a PDF file.' : selected.size > 25 * 1024 * 1024 ? 'PDFs must be 25 MB or smaller.' : null)
            }} />
          <Button icon={Upload} onClick={() => fileRef.current?.click()}>Choose a PDF</Button>
          <span className="text-xs text-muted">{file ? file.name : 'PDFs up to 25 MB are stored securely.'}</span>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Dialog>
  )
}
