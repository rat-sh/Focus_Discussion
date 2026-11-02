import { Copy, MessageCircle } from 'lucide-react'
import { roomInviteUrl } from '@/shared/lib/roomLinks'
import { safeHttpUrl } from '@/shared/lib/safeUrl'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { useToast } from '@/shared/ui/Toast'

export function InviteDialog({ open, onClose, code, name }: { open: boolean; onClose: () => void; code: string; name: string }) {
  const toast = useToast()
  const link = roomInviteUrl(code)
  const rawWa = `https://wa.me/?text=${encodeURIComponent(`Join my study room “${name}”: ${link}`)}`
  const wa = safeHttpUrl(rawWa)?.href ?? '#'
  const copy = async (value: string, label: string) => { try { await navigator.clipboard.writeText(value); toast(`${label} copied`) } catch { toast('Copy is blocked by the browser', 'error') } }
  return (
    <Dialog open={open} onClose={onClose} title="Invite to this room" size="sm">
      <div className="flex flex-col gap-4">
        <p className="break-all rounded-ui border border-line bg-raised px-3 py-2.5 font-mono text-sm">{link}</p>
        <div className="flex items-center justify-between gap-3 rounded-ui border border-line px-3 py-2">
          <span className="text-xs text-muted">Room code</span>
          <span className="font-mono text-sm font-semibold tracking-wider">{code}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={Copy} onClick={() => void copy(link, 'Invite link')}>Copy link</Button>
          <Button icon={Copy} onClick={() => void copy(code, 'Room code')}>Copy code</Button>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-ui bg-accent px-3.5 text-sm font-semibold text-accent-fg md:h-8"><MessageCircle size={16} aria-hidden />WhatsApp</a>
        </div>
      </div>
    </Dialog>
  )
}
