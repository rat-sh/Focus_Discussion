import type { SQL } from 'bun'
import { getSql } from '../../db/sql'

export async function listMaterials(userId: string, db: SQL = getSql()) {
  return db<{
    id: string
    kind: string
    title: string
    url: string
    host: string
    room_id: string | null
    tags: string[]
    size_kb: number | null
    created_at: Date
  }[]>`
    SELECT id, kind, title, url, host, room_id, tags, size_kb, created_at
    FROM materials
    WHERE owner_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT 50
  `
}

export async function insertMaterial(
  input: {
    ownerId: string
    kind: string
    title: string
    url: string
    host: string
    tags: string[]
  },
  db: SQL = getSql(),
) {
  const rows = await db<{
    id: string
    kind: string
    title: string
    url: string
    host: string
    room_id: string | null
    tags: string[]
    size_kb: number | null
    created_at: Date
  }[]>`
    INSERT INTO materials (owner_id, kind, title, url, host, tags)
    VALUES (
      ${input.ownerId}::uuid, ${input.kind}, ${input.title}, ${input.url}, ${input.host}, ${input.tags}
    )
    RETURNING id, kind, title, url, host, room_id, tags, size_kb, created_at
  `
  return rows[0]
}

export async function deleteMaterial(userId: string, id: string, db: SQL = getSql()): Promise<boolean> {
  const rows = await db<{ id: string }[]>`
    DELETE FROM materials WHERE id = ${id}::uuid AND owner_id = ${userId}::uuid RETURNING id
  `
  return Boolean(rows[0])
}
