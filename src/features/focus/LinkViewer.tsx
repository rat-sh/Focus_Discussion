import { ExternalLink, MonitorUp, PencilLine } from 'lucide-react'
import type { FocusLink } from '@/domain/types'
import { Button } from '@/shared/ui/Button'
import { safeHttpUrl } from '@/shared/lib/safeUrl'
import { noEmbedReason, resolveStudyEmbed, type NoEmbedReason } from '@/shared/lib/studyEmbed'

/**
 * Determines whether a link can be safely embedded in an iframe, and returns the iframe src.
 *
 * What can be embedded (YouTube videos, playlists, channels, Shorts) is decided in
 * `shared/lib/studyEmbed.ts`, so there is one place to extend.
 *
 * Security: rejects same-origin URLs because with `sandbox="allow-scripts allow-same-origin"`
 * a same-origin page can call `document.querySelector('iframe').removeAttribute('sandbox')`
 * on the parent, effectively removing its own sandbox.
 *
 * PDFs: Chrome's built-in PDF viewer is blocked inside sandboxed iframes (the sandbox prevents
 * the browser plugin from loading). Instead of removing the sandbox (which would re-open XSS),
 * we open PDFs in a new tab with `rel="noopener noreferrer"`.
 *
 * Other external sites use the new-tab fallback rather than being embedded, because most of them
 * refuse to load inside someone else's page.
 */
export function embedFor(link: FocusLink): string | null {
  const url = safeHttpUrl(link.url)
  if (!url) return null

  // Reject same-origin URLs (sandbox escape risk)
  if (typeof window !== 'undefined' && url.origin === window.location.origin) return null

  return resolveStudyEmbed(url)?.src ?? null
}

const NO_EMBED_COPY: Record<NoEmbedReason, { title: string; text: string }> = {
  pdf: {
    title: 'This PDF opens in its own tab',
    text: 'Browsers do not show PDFs inside a protected frame. Open it, then come back and keep studying.',
  },
  'youtube-channel-page': {
    title: 'Channel pages cannot be shown here',
    text: 'Paste a link to one video or one playlist from this channel instead, or open the channel in a new tab.',
  },
  site: {
    title: 'This site cannot be shown inside the room',
    text: 'Many sites, coding practice sites included, do not allow being shown inside another app. Open it in a new tab.',
  },
}

/** Shows a link inside the app when the site allows it. Sites that block iframes show a clear next step. */
export function LinkViewer({ link, onShareScreen }: { link: FocusLink; onShareScreen?: () => void }) {
  if (!link.url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <PencilLine size={32} strokeWidth={1.5} className="text-muted" aria-hidden />
        <p className="text-base font-semibold">Offline practice</p>
        <p className="max-w-sm text-sm text-muted">Work on paper and keep your face in the camera. Time counts while you look attentive.</p>
      </div>
    )
  }

  const safeUrl = safeHttpUrl(link.url)
  const src = embedFor(link)

  if (src) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {/*
         * sandbox flags:
         * - allow-scripts: needed for YouTube player and interactive sites to function
         * - allow-same-origin: needed for YouTube's postMessage API and site cookies/auth
         * - allow-presentation: needed for fullscreen video playback
         * - allow-forms: needed for sites with search boxes, login forms, etc.
         * - allow-popups: allow links that open popups (e.g. "Watch on YouTube")
         * - allow-popups-to-escape-sandbox: popups open as normal pages instead of broken, sandboxed ones
         *
         * referrerPolicy: YouTube refuses to play (Error 153) when no referrer is sent, so this
         * must NOT be "no-referrer". strict-origin-when-cross-origin sends only our site name.
         *
         * Security: same-origin URLs are rejected by embedFor() to prevent sandbox escape.
         */}
        <iframe key={link.id} title={link.label} src={src} sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups allow-popups-to-escape-sandbox" className="min-h-0 w-full flex-1 border-0 bg-raised" allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        {safeUrl && (
          <p className="shrink-0 border-t border-line bg-surface px-3 py-2 text-xs text-muted">Not loading? <a href={safeUrl.href} target="_blank" rel="noopener noreferrer" className="text-accent underline">Open {link.host} in a new tab</a></p>
        )}
      </div>
    )
  }

  // Fallback for PDFs, channel pages, sites that block frames, and unsafe URLs
  const copy = safeUrl ? NO_EMBED_COPY[noEmbedReason(safeUrl)] : null
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <ExternalLink size={28} strokeWidth={1.5} className="text-muted" aria-hidden />
      <p className="text-sm font-semibold">{link.label}</p>
      {copy ? (
        <>
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="max-w-sm text-xs text-muted">{copy.text}</p>
        </>
      ) : (
        <p className="text-sm text-danger">This URL cannot be opened safely.</p>
      )}
      {safeUrl && (
        <a href={safeUrl.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex h-11 items-center gap-2 rounded-ui bg-accent px-4 text-sm font-semibold text-accent-fg md:h-9 md:text-sm">Open {link.host}<ExternalLink size={14} aria-hidden /></a>
      )}
      {safeUrl && onShareScreen && (
        <>
          <Button variant="secondary" icon={MonitorUp} onClick={onShareScreen}>Share my screen with the room</Button>
          <p className="max-w-sm text-xs text-muted">Open it in a new tab, then share your screen so everyone can follow along.</p>
        </>
      )}
    </div>
  )
}