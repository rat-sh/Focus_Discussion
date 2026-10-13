import { ApiError } from '@/shared/lib/apiError'
import type { ScheduleRepo } from '../repositories'
import { createScheduledSession, listScheduledSessions, removeScheduledSession, updateScheduledSession } from './schedule'

export const scheduleRepo: ScheduleRepo = {
  upcoming: listScheduledSessions,
  create: async (input) => {
    if (!input.roomId) throw new ApiError('VALIDATION_FAILED', 'Choose a room for this session', 400)
    return createScheduledSession({ ...input, roomId: input.roomId })
  },
  update: updateScheduledSession,
  remove: removeScheduledSession,
}
