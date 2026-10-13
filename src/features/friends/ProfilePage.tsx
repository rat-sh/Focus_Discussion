import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { Async, EmptyState } from '@/shared/ui/Feedback'
import { Panel } from '@/shared/ui/Panel'
import { useToast } from '@/shared/ui/Toast'
import { Users } from 'lucide-react'

/** /add/:handle is the link people share in WhatsApp. It lands on the profile. */
export const AddRedirect = () => <Navigate to={`/u/${useParams().handle ?? ''}`} replace />

export function ProfilePage() {
  const { handle = '' } = useParams()
  const res = useResource(() => repos.profile.byHandle(handle), handle)
  const toast = useToast()

  const act = async (id: string, relation: string) => {
    if (relation === 'none') await repos.friends.sendRequest(id)
    else {
      const req = (await repos.friends.requests()).find((r) => r.user.id === id)
      if (req) await (relation === 'incoming' ? repos.friends.respond(req.id, true) : repos.friends.cancel(req.id))
    }
    await res.reload()
    toast(relation === 'none' ? 'Request sent' : relation === 'incoming' ? 'Friend added' : 'Request cancelled')
  }

  return (
    <>
      <Link to="/friends" className="mb-3 inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-fg md:h-8"><ArrowLeft size={14} aria-hidden />Friends</Link>
      <Async res={res}>
        {(p) => !p ? <Panel><EmptyState icon={Users} title="No such user" text="Check the link, or search for them by name." /></Panel> : (
          <Panel className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={p.name} url={p.avatarUrl} size={72} />
            <div><h1 className="text-lg font-semibold">{p.name}</h1><p className="text-sm text-muted">@{p.handle}</p></div>
            {p.relation === 'self' ? <p className="text-sm text-muted">This is you.</p>
              : p.relation === 'friend' ? <p className="text-sm text-muted">You are friends.</p>
              : <Button variant={p.relation === 'outgoing' ? 'secondary' : 'primary'} icon={p.relation === 'none' || p.relation === 'incoming' ? UserPlus : undefined} onClick={() => void act(p.id, p.relation)}>
                  {p.relation === 'none' ? 'Add friend' : p.relation === 'incoming' ? 'Accept request' : 'Cancel request'}
                </Button>}
          </Panel>
        )}
      </Async>
    </>
  )
}
