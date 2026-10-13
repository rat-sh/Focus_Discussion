import type { Friend, FriendRequest, PersonSearchHit } from '@/domain/types'
import type { FriendRepo } from '../repositories'
import { asArray } from './common'
import { getSupabase } from './client'
import { fromSupabase } from './errors'

export const friendRepo: FriendRepo = {
  async list() {
    const { data, error } = await getSupabase().rpc('list_friends')
    if (error) fromSupabase(error)
    return asArray<Friend>(data)
  },
  async requests() {
    const { data, error } = await getSupabase().rpc('list_friend_requests')
    if (error) fromSupabase(error)
    return asArray<FriendRequest>(data)
  },
  async search(query) {
    const { data, error } = await getSupabase().rpc('search_people', { p_query: query })
    if (error) fromSupabase(error)
    return asArray<PersonSearchHit>(data)
  },
  async sendRequest(userId) {
    const { error } = await getSupabase().rpc('send_friend_request', { p_user_id: userId })
    if (error) fromSupabase(error)
  },
  async respond(requestId, accept) {
    const { error } = await getSupabase().rpc('respond_friend_request', {
      p_id: requestId,
      p_accept: accept,
    })
    if (error) fromSupabase(error)
  },
  async cancel(requestId) {
    const { error } = await getSupabase().rpc('cancel_friend_request', { p_id: requestId })
    if (error) fromSupabase(error)
  },
  async remove(friendId) {
    const { error } = await getSupabase().rpc('remove_friend', { p_friend_id: friendId })
    if (error) fromSupabase(error)
  },
}
