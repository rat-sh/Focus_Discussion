import { z } from 'zod'
import { ApiError } from '@/shared/lib/apiError'
import { supabaseApiRequest } from '@/data/supabase/request'

const SearchStatus = z.object({ enabled: z.boolean() })
const SearchResults = z.object({
  items: z.array(z.object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().min(1),
    channelTitle: z.string().min(1),
    thumbnailUrl: z.string().url().refine((value) => new URL(value).protocol === 'https:').nullable(),
  })),
})

export type YouTubeSearchResult = z.infer<typeof SearchResults>['items'][number]

export async function isYouTubeSearchEnabled(): Promise<boolean> {
  const parsed = SearchStatus.safeParse(await supabaseApiRequest('/api/v1/youtube/status'))
  if (!parsed.success) throw new ApiError('INTERNAL', 'YouTube search service returned an invalid status', 502)
  return parsed.data.enabled
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  const params = new URLSearchParams({ q: query })
  const parsed = SearchResults.safeParse(await supabaseApiRequest(`/api/v1/youtube/search?${params}`))
  if (!parsed.success) throw new ApiError('INTERNAL', 'YouTube search service returned invalid results', 502)
  return parsed.data.items
}
