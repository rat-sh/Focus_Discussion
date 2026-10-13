import type { ID, Material, NewMaterial } from '@/domain/types'
import { ApiError } from '@/shared/lib/apiError'
import { safeHttpUrl } from '@/shared/lib/safeUrl'
import type { MaterialRepo } from '../repositories'
import { uid } from './common'
import { getSupabase } from './client'
import { fromSupabase } from './errors'

async function mapMaterial(row: {
  id: string
  kind: Material['kind']
  title: string
  url: string
  host: string
  room_id: string | null
  storage_path: string | null
  tags: string[]
  size_kb: number | null
  created_at: string
}): Promise<Material> {
  let url = row.url
  if (row.storage_path) {
    const { data, error } = await getSupabase()
      .storage.from('study-materials')
      .createSignedUrl(row.storage_path, 24 * 60 * 60)
    if (error) fromSupabase(error)
    url = data.signedUrl
  }
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    url,
    host: row.host,
    ...(row.room_id ? { roomId: row.room_id } : {}),
    scope: row.room_id ? 'room' : 'personal',
    scopeLabel: row.room_id ? 'Room' : 'Personal',
    tags: row.tags ?? [],
    addedAt: row.created_at,
    ...(row.size_kb != null ? { sizeKb: row.size_kb } : {}),
  }
}

export const materialRepo: MaterialRepo = {
  async list(roomId) {
    const id = await uid()
    let query = getSupabase()
      .from('materials')
      .select('id, kind, title, url, host, room_id, storage_path, tags, size_kb, created_at')
    if (roomId) query = query.or(`owner_id.eq.${id},room_id.eq.${roomId}`)
    else query = query.eq('owner_id', id)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) fromSupabase(error)
    return Promise.all((data ?? []).map(mapMaterial))
  },
  async add(input: NewMaterial) {
    const id = await uid()
    const supabase = getSupabase()
    let storagePath: string | null = null
    let url = ''
    let host = ''
    if (input.file) {
      if (input.kind !== 'pdf' || input.file.type !== 'application/pdf' || input.file.size > 25 * 1024 * 1024) {
        throw new ApiError('VALIDATION_FAILED', 'Choose a PDF no larger than 25 MB', 400)
      }
      storagePath = `${id}/${crypto.randomUUID()}.pdf`
      const { error } = await supabase.storage.from('study-materials').upload(storagePath, input.file, {
        contentType: 'application/pdf',
        upsert: false,
      })
      if (error) fromSupabase(error)
      host = 'Supabase Storage'
    } else {
      const safeUrl = safeHttpUrl(input.url ?? '')
      if (!safeUrl) throw new ApiError('VALIDATION_FAILED', 'Invalid or unsafe URL', 400)
      url = safeUrl.toString()
      host = safeUrl.host
    }

    const { data, error } = await supabase
      .from('materials')
      .insert({
        owner_id: id,
        room_id: input.roomId ?? null,
        kind: input.kind,
        title: input.title,
        url,
        host,
        storage_path: storagePath,
        size_kb: input.file ? Math.ceil(input.file.size / 1024) : null,
        tags: input.tags,
      })
      .select('id, kind, title, url, host, room_id, storage_path, tags, size_kb, created_at')
      .single()
    if (error || !data) {
      if (storagePath) {
        const { error: cleanupError } = await supabase.storage.from('study-materials').remove([storagePath])
        if (cleanupError) throw new ApiError('INTERNAL', 'Material could not be saved and its uploaded PDF could not be removed', 500)
      }
      fromSupabase(error)
    }
    return mapMaterial(data)
  },
  async remove(id: ID) {
    const me = await uid()
    const { data, error } = await getSupabase()
      .from('materials')
      .delete()
      .eq('id', id)
      .eq('owner_id', me)
      .select('id, storage_path')
    if (error) fromSupabase(error)
    if (!data?.length) throw new ApiError('NOT_FOUND', 'Material not found', 404)
    const storagePath = data[0].storage_path
    if (storagePath) {
      const { error: storageError } = await getSupabase().storage.from('study-materials').remove([storagePath])
      if (storageError) throw new ApiError('INTERNAL', 'Material was removed but its stored PDF could not be deleted', 500)
    }
  },
}
