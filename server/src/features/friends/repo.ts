import type { SQL } from 'bun'
import { getSql } from '../../db/sql'

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export async function searchUsers(userId: string, query: string, db: SQL = getSql()) {
  const q = `%${query}%`
  return db<{
    id: string
    name: string
    handle: string
    avatar_url: string | null
    relation: 'none' | 'friend' | 'incoming' | 'outgoing' | 'self'
    mutual_friends: number
  }[]>`
    SELECT
      p.user_id AS id,
      p.name,
      p.handle::text AS handle,
      p.avatar_url,
      CASE
        WHEN p.user_id = ${userId}::uuid THEN 'self'
        WHEN f.status = 'accepted' THEN 'friend'
        WHEN f.status = 'pending' AND f.requested_by = ${userId}::uuid THEN 'outgoing'
        WHEN f.status = 'pending' AND f.requested_by <> ${userId}::uuid THEN 'incoming'
        ELSE 'none'
      END AS relation,
      0 AS mutual_friends
    FROM profiles p
    LEFT JOIN friendships f ON (
      (f.user_a = LEAST(${userId}::uuid, p.user_id) AND f.user_b = GREATEST(${userId}::uuid, p.user_id))
      AND f.status IN ('pending', 'accepted', 'blocked')
    )
    WHERE (p.name ILIKE ${q} OR p.handle::text ILIKE ${q})
      AND COALESCE(f.status, '') <> 'blocked'
    ORDER BY p.handle
    LIMIT 8
  `
}

export async function listFriends(userId: string, db: SQL = getSql()) {
  return db<{
    id: string
    name: string
    handle: string
    avatar_url: string | null
  }[]>`
    SELECT p.user_id AS id, p.name, p.handle::text AS handle, p.avatar_url
    FROM friendships f
    JOIN profiles p ON p.user_id = CASE WHEN f.user_a = ${userId}::uuid THEN f.user_b ELSE f.user_a END
    WHERE f.status = 'accepted'
      AND (f.user_a = ${userId}::uuid OR f.user_b = ${userId}::uuid)
    ORDER BY p.name
  `
}

export async function listRequests(userId: string, db: SQL = getSql()) {
  return db<{
    id: string
    direction: 'incoming' | 'outgoing'
    user_id: string
    name: string
    handle: string
    avatar_url: string | null
    created_at: Date
  }[]>`
    SELECT
      f.id,
      CASE WHEN f.requested_by = ${userId}::uuid THEN 'outgoing' ELSE 'incoming' END AS direction,
      p.user_id, p.name, p.handle::text AS handle, p.avatar_url, f.created_at
    FROM friendships f
    JOIN profiles p ON p.user_id = CASE
      WHEN f.requested_by = f.user_a THEN f.user_b ELSE f.user_a
    END
    WHERE f.status = 'pending'
      AND (f.user_a = ${userId}::uuid OR f.user_b = ${userId}::uuid)
    ORDER BY f.created_at DESC
  `
}

export async function findFriendship(a: string, b: string, db: SQL = getSql()) {
  const [userA, userB] = orderedPair(a, b)
  const rows = await db<{
    id: string
    status: string
    requested_by: string
    user_a: string
    user_b: string
  }[]>`
    SELECT id, status, requested_by, user_a, user_b FROM friendships
    WHERE user_a = ${userA}::uuid AND user_b = ${userB}::uuid
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function insertRequest(fromId: string, toId: string, db: SQL = getSql()) {
  const [userA, userB] = orderedPair(fromId, toId)
  const rows = await db<{ id: string }[]>`
    INSERT INTO friendships (user_a, user_b, status, requested_by)
    VALUES (${userA}::uuid, ${userB}::uuid, 'pending', ${fromId}::uuid)
    RETURNING id
  `
  return rows[0]
}

export async function getRequest(id: string, db: SQL = getSql()) {
  const rows = await db<{
    id: string
    status: string
    requested_by: string
    user_a: string
    user_b: string
  }[]>`
    SELECT id, status, requested_by, user_a, user_b FROM friendships WHERE id = ${id}::uuid LIMIT 1
  `
  return rows[0] ?? null
}

export async function setStatus(id: string, status: string, db: SQL = getSql()): Promise<void> {
  await db`
    UPDATE friendships SET status = ${status}, updated_at = now() WHERE id = ${id}::uuid
  `
}

export async function deleteFriendship(id: string, db: SQL = getSql()): Promise<void> {
  await db`DELETE FROM friendships WHERE id = ${id}::uuid`
}

export async function removeFriend(userId: string, friendId: string, db: SQL = getSql()): Promise<boolean> {
  const [userA, userB] = orderedPair(userId, friendId)
  const rows = await db<{ id: string }[]>`
    DELETE FROM friendships
    WHERE user_a = ${userA}::uuid AND user_b = ${userB}::uuid AND status = 'accepted'
    RETURNING id
  `
  return Boolean(rows[0])
}

export async function blockUser(userId: string, otherId: string, db: SQL = getSql()): Promise<void> {
  const [userA, userB] = orderedPair(userId, otherId)
  await db`
    INSERT INTO friendships (user_a, user_b, status, requested_by)
    VALUES (${userA}::uuid, ${userB}::uuid, 'blocked', ${userId}::uuid)
    ON CONFLICT (user_a, user_b) DO UPDATE SET status = 'blocked', updated_at = now()
  `
}
