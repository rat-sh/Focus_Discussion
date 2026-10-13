import type { WeeklyStats } from '@/domain/types'
import type { StatsRepo } from '../repositories'
import { asObject } from './common'
import { getSupabase } from './client'
import { fromSupabase } from './errors'

export const statsRepo: StatsRepo = {
  async weekly() {
    const { data, error } = await getSupabase().rpc('weekly_stats')
    if (error) fromSupabase(error)
    const stats = asObject<WeeklyStats>(data)
    if (!stats) fromSupabase({ message: 'INTERNAL: weekly_stats empty' })
    return stats
  },
}
