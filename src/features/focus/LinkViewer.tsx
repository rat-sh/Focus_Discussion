import { ExternalLink, PencilLine } from 'lucide-react'
import type { FocusLink } from '@/domain/types'
import { safeHttpUrl, isValidYouTubeId } from '@/shared/lib/safeUrl'

/** Extracts a safe YouTube video ID from a validated URL. */
function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.slice(1)
  else if (host === 'youtube.com' || host.endsWith('.youtube.com')) id = u.searchParams.get('v')
  return id && isValidYouTubeId(id) ? id : null
}

/** Returns true when the URL probably points to a PDF that Chrome won't render in a sandboxed iframe. */
function isProbablyPdf(url: URL): boolean {
  return url.pathname.toLowerCase().endsWith('.pdf')
}

/**
 * Determines whether a link can be safely embedded in an iframe.
 *
 * Security: rejects same-origin URLs because with `sandbox="allow-scripts allow-same-origin"`
 * a same-origin page can call `document.querySelector('iframe').removeAttribute('sandbox')`
 * on the parent, effectively removing its own sandbox.
 *
 * PDFs: Chrome's built-in PDF viewer is blocked inside sandboxed iframes (the sandbox prevents
 * the browser plugin from loading). Instead of removing the sandbox (which would re-open XSS),
 * we open PDFs in a new tab with `rel="noopener noreferrer"`.
 *
 * Other external URLs use the new-tab fallback rather than being embedded.
 */
export function embedFor(link: FocusLink): string | null {
  const url = safeHttpUrl(link.url)
  if (!url) return null

  // Reject same-origin URLs (sandbox escape risk)
  if (typeof window !== 'undefined' && url.origin === window.location.origin) return null

  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const ytId = youtubeId(url)
    return ytId ? `https://www.youtube-nocookie.com/embed/${ytId}` : null
  }

  // PDFs are NOT embedded: Chrome's PDF viewer does not work inside sandboxed iframes.
  if (isProbablyPdf(url)) return null

  return null
}

/** Shows a link inside the app when the site allows it. Sites that block iframes show a fallback link. */
export function LinkViewer({ link }: { link: FocusLink }) {
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
         * - allow-popups: allow links that open popups (e.g. OAuth)
         *
         * Security: same-origin URLs are rejected by embedFor() to prevent sandbox escape.
         */}
        <iframe key={link.id} title={link.label} src={src} sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups" className="min-h-0 w-full flex-1 border-0 bg-raised" allow="encrypted-media; fullscreen" referrerPolicy="no-referrer" />
        {safeUrl && (
          <p className="shrink-0 border-t border-line bg-surface px-3 py-2 text-xs text-muted">Not loading? <a href={safeUrl.href} target="_blank" rel="noopener noreferrer" className="text-accent underline">Open {link.host} in a new tab</a></p>
        )}
      </div>
    )
  }

  // Fallback for PDFs and unsafe URLs — open in a new tab
  return (
    <div className="flex h-full flex-col items-center gap-2 px-6 pt-12 text-center md:pt-16">
      <ExternalLink size={28} strokeWidth={1.5} className="text-muted" aria-hidden />
      <p className="text-sm font-semibold">{link.label}</p>
      <p className="max-w-xs text-xs text-muted">This file cannot be previewed inline. Open it in a new tab to view it.</p>
      {safeUrl ? (
        <a href={safeUrl.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex h-11 items-center gap-2 rounded-ui bg-accent px-4 text-sm font-semibold text-accent-fg md:h-9 md:text-sm">Open {link.host}<ExternalLink size={14} aria-hidden /></a>
      ) : (
        <p className="text-sm text-danger">This URL cannot be opened safely.</p>
      )}
    </div>
  )
}
