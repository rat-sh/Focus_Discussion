import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'
import { rateLimit } from '../../middleware/rateLimit'
import { supabaseUser } from '../../middleware/supabaseAuth'

const YouTubeSearchResponse = z.object({
  items: z.array(z.object({
    id: z.object({ videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }),
    snippet: z.object({
      title: z.string().min(1).max(500),
      channelTitle: z.string().min(1).max(200),
      thumbnails: z.object({
        medium: z.object({ url: z.string().url().refine((value) => new URL(value).protocol === 'https:') }).optional(),
        default: z.object({ url: z.string().url().refine((value) => new URL(value).protocol === 'https:') }).optional(),
      }).optional(),
    }),
  })).max(10),
})

export const youtubeRoutes = new Hono()

youtubeRoutes.get(
  '/status',
  rateLimit('youtube.status', (c) => String(c.get('clientIp'))),
  async (c) => {
    await supabaseUser(c.req.header('Authorization'))
    return c.json({ enabled: Boolean(env().YOUTUBE_API_KEY) })
  },
)

youtubeRoutes.get(
  '/search',
  rateLimit('youtube.search', (c) => String(c.get('clientIp'))),
  zValidator('query', z.object({ q: z.string().trim().min(1).max(100) }).strict()),
  async (c) => {
    await supabaseUser(c.req.header('Authorization'))
    const apiKey = env().YOUTUBE_API_KEY
    if (!apiKey) throw new AppError('INTERNAL', 'YouTube search is not configured', 503)

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.search = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '10',
      q: c.req.valid('query').q,
      key: apiKey,
    }).toString()

    let response: Response
    try {
      response = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })
    } catch (cause) {
      throw new AppError('INTERNAL', 'YouTube search could not be reached', 502, { cause })
    }
    if (!response.ok) {
      throw new AppError('INTERNAL', 'YouTube search request failed', 502)
    }

    let body: unknown
    try {
      body = await response.json()
    } catch (cause) {
      throw new AppError('INTERNAL', 'YouTube returned an invalid search response', 502, { cause })
    }
    const parsed = YouTubeSearchResponse.safeParse(body)
    if (!parsed.success) throw new AppError('INTERNAL', 'YouTube returned an invalid search response', 502)

    return c.json({
      items: parsed.data.items.map(({ id, snippet }) => ({
        videoId: id.videoId,
        title: snippet.title,
        channelTitle: snippet.channelTitle,
        thumbnailUrl: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? null,
      })),
    })
  },
)
