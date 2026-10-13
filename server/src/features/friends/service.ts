import type { FriendDto, FriendRequestDto, PersonSearchHitDto } from '@studyroom/contract'
import { AppError } from '../../lib/errors'
import * as repo from './repo'

export async function search(userId: string, query: string): Promise<PersonSearchHitDto[]> {
  if (query.trim().length < 1) return []
  const rows = await repo.searchUsers(userId, query.trim())
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    avatarUrl: r.avatar_url,
    relation: r.relation,
    mutualFriends: r.mutual_friends,
  }))
}

export async function list(userId: string): Promise<FriendDto[]> {
  const rows = await repo.listFriends(userId)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    avatarUrl: r.avatar_url,
    presence: 'offline' as const,
  }))
}

export async function requests(userId: string): Promise<FriendRequestDto[]> {
  const rows = await repo.listRequests(userId)
  return rows.map((r) => ({
    id: r.id,
    direction: r.direction,
    user: {
      id: r.user_id,
      name: r.name,
      handle: r.handle,
      avatarUrl: r.avatar_url,
    },
    at: new Date(r.created_at).toISOString(),
  }))
}

export async function sendRequest(userId: string, targetId: string): Promise<void> {
  if (userId === targetId) throw AppError.validation('Cannot friend yourself')
  const existing = await repo.findFriendship(userId, targetId)
  if (existing?.status === 'blocked') throw AppError.forbidden('Blocked')
  if (existing?.status === 'accepted') throw AppError.conflict('Already friends')
  if (existing?.status === 'pending') throw AppError.conflict('Request already pending')
  try {
    await repo.insertRequest(userId, targetId)
  } catch (err) {
    if (String(err).includes('friendships_unique') || String(err).includes('duplicate')) {
      throw AppError.conflict('Request already pending')
    }
    throw err
  }
}

export async function respond(userId: string, requestId: string, accept: boolean): Promise<void> {
  const row = await repo.getRequest(requestId)
  if (row?.status !== 'pending') throw AppError.notFound('Request not found')
  if (row.requested_by === userId) throw AppError.forbidden('Cannot respond to your own request')
  if (row.user_a !== userId && row.user_b !== userId) throw AppError.forbidden()
  if (accept) await repo.setStatus(requestId, 'accepted')
  else await repo.deleteFriendship(requestId)
}

export async function cancel(userId: string, requestId: string): Promise<void> {
  const row = await repo.getRequest(requestId)
  if (row?.status !== 'pending') throw AppError.notFound('Request not found')
  if (row.requested_by !== userId) throw AppError.forbidden()
  await repo.deleteFriendship(requestId)
}

export async function remove(userId: string, friendId: string): Promise<void> {
  const ok = await repo.removeFriend(userId, friendId)
  if (!ok) throw AppError.notFound('Friendship not found')
}
