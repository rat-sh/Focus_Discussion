import { useState } from 'react'
import { Crosshair, Eraser, Highlighter, ImagePlus, MousePointer2, MoveUpRight, Pencil, Shapes, Type, type LucideIcon } from 'lucide-react'
import { cx } from '@/shared/lib/cx'
import { avatarColor } from '@/shared/lib/avatarPalette'

type Tool = 'select' | 'pen' | 'highlighter' | 'red' | 'eraser' | 'shapes' | 'arrow' | 'text' | 'image' | 'laser'
const TOOLS: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 }, { id: 'pen', label: 'Pen', icon: Pencil }, { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
  { id: 'red', label: 'Red marker', icon: Pencil }, { id: 'eraser', label: 'Eraser', icon: Eraser }, { id: 'shapes', label: 'Shapes', icon: Shapes },
  { id: 'arrow', label: 'Arrow', icon: MoveUpRight }, { id: 'text', label: 'Text', icon: Type }, { id: 'image', label: 'Insert image', icon: ImagePlus }, { id: 'laser', label: 'Laser pointer', icon: Crosshair },
]

const Box = ({ x, y, w, h, title, sub }: { x: number; y: number; w: number; h: number; title: string; sub: string }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={6} className="fill-surface stroke-muted" strokeWidth={1.5} />
    <text x={x + w / 2} y={y + h / 2 - 3} textAnchor="middle" className="fill-fg font-mono" fontSize={14} fontWeight={600}>{title}</text>
    <text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" className="fill-muted" fontSize={12}>{sub}</text>
  </g>
)
const Arrow = ({ d }: { d: string }) => <path d={d} fill="none" className="stroke-muted" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
const Cursor = ({ x, y, name }: { x: number; y: number; name: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0 L0 16 L5 12 L9 20 L12 18 L8 11 L14 11 Z" className="fill-fg" />
    <rect x={14} y={14} width={name.length * 8 + 14} height={20} rx={4} fill={avatarColor(name)} />
    <text x={21} y={28} fontSize={12} className="fill-white">{name}</text>
  </g>
)

/**
 * Design-phase board surface. The real, shared drawing board mounts in this exact slot later.
 * The toolbar, pages and permission chip are the final layout.
 */
export function BoardStage() {
  const [tool, setTool] = useState<Tool>('pen')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p role="note" className="shrink-0 border-b border-line bg-raised px-3 py-1.5 text-xs text-muted">Board preview. Drawing and live sync are not connected yet.</p>
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-auto" aria-label="Board preview. Pan to move around.">
          <svg viewBox="-70 0 900 480" className="h-full min-h-[360px] w-[900px] min-w-[900px] md:w-full md:min-w-0" role="img" aria-label="System design sketch: client, load balancer, three API servers, Redis, Postgres, Kafka">
            <defs><marker id="arrowhead" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="fill-muted" /></marker></defs>
            <Box x={40} y={205} w={120} h={64} title="CLIENT" sub="Web / Mobile" />
            <Box x={230} y={200} w={150} h={74} title="LOAD BALANCER" sub="Round robin" />
            <Box x={450} y={100} w={150} h={64} title="API SERVER 01" sub="Node.js" />
            <Box x={450} y={205} w={150} h={64} title="API SERVER 02" sub="Node.js" />
            <Box x={450} y={310} w={150} h={64} title="API SERVER 03" sub="Node.js" />
            <Box x={680} y={96} w={110} h={56} title="REDIS" sub="cache" />
            <Box x={680} y={210} w={110} h={56} title="POSTGRES" sub="primary" />
            <Box x={680} y={324} w={110} h={56} title="KAFKA" sub="events" />
            <Arrow d="M160 237 H228" /><Arrow d="M380 237 C415 237 415 132 448 132" /><Arrow d="M380 237 H448" /><Arrow d="M380 237 C415 237 415 342 448 342" />
            <Arrow d="M600 132 H678" /><Arrow d="M600 237 H678" /><Arrow d="M600 342 H678" />
            <path d="M610 176 C650 150 700 160 742 186" fill="none" className="stroke-danger" strokeWidth={3} strokeLinecap="round" markerEnd="url(#arrowhead)" />
            <Cursor x={300} y={110} name="Ishita" /><Cursor x={580} y={400} name="Sana" />
          </svg>
        </div>
        {/* Toolbar: vertical on desktop, pill at the bottom on phones */}
        <div role="toolbar" aria-label="Drawing tools" aria-orientation="horizontal"
          className="no-scrollbar absolute bottom-3 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-ui border border-line bg-surface p-1 md:bottom-auto md:left-3 md:top-3 md:max-w-none md:translate-x-0 md:flex-col md:overflow-visible">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-label={label} title={label} aria-pressed={tool === id} onClick={() => setTool(id)}
              className={cx('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-ui md:h-9 md:w-9', tool === id ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-raised hover:text-fg')}>
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              {id === 'red' && <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-danger" aria-hidden />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
