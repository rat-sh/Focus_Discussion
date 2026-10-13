import type { MaterialDto, NewMaterialBody } from '@studyroom/contract'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'
import { safeHttpUrl } from '../../lib/safeUrl'
import * as repo from './repo'

function toDto(row: {
  id: string
  kind: string
  title: string
  url: string
  host: string
  room_id: string | null
  tags: string[]
  size_kb: number | null
  created_at: Date
}): MaterialDto {
  return {
    id: row.id,
    kind: row.kind as MaterialDto['kind'],
    title: row.title,
    url: row.url,
    host: row.host,
    scope: row.room_id ? 'room' : 'personal',
    scopeLabel: row.room_id ? 'Room' : 'Personal',
    tags: row.tags,
    addedAt: new Date(row.created_at).toISOString(),
    ...(row.size_kb != null ? { sizeKb: row.size_kb } : {}),
  }
}

export async function list(userId: string): Promise<MaterialDto[]> {
  return (await repo.listMaterials(userId)).map(toDto)
}

export async function add(userId: string, body: NewMaterialBody): Promise<MaterialDto> {
  const allowHttp = env().NODE_ENV !== 'production'
  const url = safeHttpUrl(body.url, allowHttp)
  if (!url) throw AppError.validation('Invalid or unsafe URL')
  const row = await repo.insertMaterial({
    ownerId: userId,
    kind: body.kind,
    title: body.title,
    url: url.toString(),
    host: url.host,
    tags: body.tags,
  })
  if (!row) throw AppError.internal('Failed to create material')
  return toDto(row)
}

export async function remove(userId: string, id: string): Promise<void> {
  const ok = await repo.deleteMaterial(userId, id)
  if (!ok) throw AppError.notFound('Material not found')
}
