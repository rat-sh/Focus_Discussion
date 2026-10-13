import { z } from 'zod'

export const ErrorCode = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'GONE',
  'RATE_LIMITED',
  'INTERNAL',
])
export type ErrorCode = z.infer<typeof ErrorCode>

export const ErrorEnvelope = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.unknown().optional(),
    retryAfterSec: z.number().int().positive().optional(),
  }),
})
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>

export const CursorPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  })

export const RegisterBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .regex(/^[a-z0-9._]{3,24}$/),
})
export type RegisterBody = z.infer<typeof RegisterBody>

export const LoginBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
})
export type LoginBody = z.infer<typeof LoginBody>

export const ProfileDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
  streakDays: z.number().int(),
})
export type ProfileDto = z.infer<typeof ProfileDto>

export const PatchProfileBody = z
  .object({
    name: z.string().min(1).max(60).optional(),
    handle: z
      .string()
      .regex(/^[a-z0-9._]{3,24}$/)
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.handle !== undefined, {
    message: 'At least one field required',
  })
export type PatchProfileBody = z.infer<typeof PatchProfileBody>

export const AuthTokensDto = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  user: ProfileDto,
})
export type AuthTokensDto = z.infer<typeof AuthTokensDto>

export const RoomMode = z.enum(['study', 'teach'])
export type RoomMode = z.infer<typeof RoomMode>

export const RoomDto = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  topic: z.string(),
  mode: RoomMode,
  membership: z.enum(['owner', 'member']),
  ownerName: z.string(),
  memberCount: z.number().int(),
  sessionCount: z.number().int(),
  lastSessionAt: z.string().nullable(),
})
export type RoomDto = z.infer<typeof RoomDto>

export const CreateRoomBody = z.object({
  name: z.string().min(1).max(80),
  topic: z.string().max(200).default(''),
  mode: RoomMode.default('study'),
})
export type CreateRoomBody = z.infer<typeof CreateRoomBody>

export const UpdateRoomBody = z
  .object({
    name: z.string().min(1).max(80).optional(),
    topic: z.string().max(200).optional(),
    closed: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.topic !== undefined || v.closed !== undefined, {
    message: 'At least one field required',
  })
export type UpdateRoomBody = z.infer<typeof UpdateRoomBody>

export const RoomPreviewDto = z.object({
  code: z.string(),
  name: z.string(),
  hostName: z.string(),
  mode: RoomMode,
  insideCount: z.number().int(),
  availability: z.enum(['open', 'full', 'expired', 'not-found']),
})
export type RoomPreviewDto = z.infer<typeof RoomPreviewDto>

export const RoomMemberDto = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  handle: z.string(),
  role: z.enum(['owner', 'member']),
  joinedAt: z.string(),
})
export type RoomMemberDto = z.infer<typeof RoomMemberDto>

export const JoinRoomBody = z.object({
  code: z.string().min(4).max(16),
})
export type JoinRoomBody = z.infer<typeof JoinRoomBody>

export const PersonLiteDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
})
export type PersonLiteDto = z.infer<typeof PersonLiteDto>

export const FriendDto = PersonLiteDto.extend({
  presence: z.enum(['online', 'in-room', 'offline']),
  roomName: z.string().optional(),
  roomCode: z.string().optional(),
})
export type FriendDto = z.infer<typeof FriendDto>

export const FriendRequestDto = z.object({
  id: z.string().uuid(),
  direction: z.enum(['incoming', 'outgoing']),
  user: PersonLiteDto,
  at: z.string(),
})
export type FriendRequestDto = z.infer<typeof FriendRequestDto>

export const PersonSearchHitDto = PersonLiteDto.extend({
  relation: z.enum(['none', 'friend', 'incoming', 'outgoing', 'self']),
  mutualFriends: z.number().int(),
})
export type PersonSearchHitDto = z.infer<typeof PersonSearchHitDto>

export const SendFriendRequestBody = z.object({
  userId: z.string().uuid(),
})
export type SendFriendRequestBody = z.infer<typeof SendFriendRequestBody>

export const RespondFriendBody = z.object({
  accept: z.boolean(),
})
export type RespondFriendBody = z.infer<typeof RespondFriendBody>

export const MaterialKind = z.enum(['pdf', 'video', 'article', 'practice', 'ai', 'notes'])
export type MaterialKind = z.infer<typeof MaterialKind>

export const MaterialDto = z.object({
  id: z.string().uuid(),
  kind: MaterialKind,
  title: z.string(),
  url: z.string(),
  host: z.string(),
  scope: z.enum(['personal', 'room']),
  scopeLabel: z.string(),
  tags: z.array(z.string()),
  addedAt: z.string(),
  sizeKb: z.number().int().optional(),
})
export type MaterialDto = z.infer<typeof MaterialDto>

export const NewMaterialBody = z.object({
  kind: MaterialKind,
  title: z.string().min(1).max(200),
  url: z.string().url().max(2048),
  tags: z.array(z.string().max(40)).max(20).default([]),
})
export type NewMaterialBody = z.infer<typeof NewMaterialBody>

export const QualityState = z.enum(['focused', 'phone', 'resting', 'lapse', 'idle'])
export type QualityState = z.infer<typeof QualityState>

export const FocusLinkDto = z.object({
  id: z.string(),
  kind: z.enum(['material', 'practice', 'ai']),
  label: z.string(),
  url: z.string(),
  host: z.string(),
})
export type FocusLinkDto = z.infer<typeof FocusLinkDto>

export const FocusPlanDto = z.object({
  title: z.string(),
  durationMin: z.number().int(),
  restBudgetPct: z.number().int(),
  camera: z.enum(['visible', 'hidden']),
  tracking: z.enum(['camera', 'none']),
  links: z.array(FocusLinkDto),
})
export type FocusPlanDto = z.infer<typeof FocusPlanDto>

export const QualitySegmentDto = z.object({
  clientSegmentId: z.string().max(64).optional(),
  state: QualityState,
  startSec: z.number().int().nonnegative(),
  endSec: z.number().int().nonnegative(),
})
export type QualitySegmentDto = z.infer<typeof QualitySegmentDto>

export const FocusSessionDto = z.object({
  id: z.string().uuid(),
  title: z.string(),
  startedAt: z.string(),
  plannedMin: z.number().int(),
  elapsedSec: z.number().int(),
  restBudgetPct: z.number().int(),
  tracked: z.boolean(),
  segments: z.array(QualitySegmentDto),
})
export type FocusSessionDto = z.infer<typeof FocusSessionDto>

export const StartFocusBody = z.object({
  title: z.string().min(1).max(100).default('Focus session'),
  plannedMin: z.number().int().min(5).max(480),
  restBudgetPct: z.number().int().min(0).max(50).default(10),
  tracked: z.boolean().default(true),
  cameraMode: z.enum(['visible', 'hidden']).default('visible'),
  links: z
    .array(
      z.object({
        kind: z.enum(['material', 'practice', 'ai']),
        label: z.string().min(1).max(100),
        url: z.string().max(2048).default(''),
        host: z.string().max(255).default(''),
      }),
    )
    .max(20)
    .default([]),
})
export type StartFocusBody = z.infer<typeof StartFocusBody>

export const StopFocusBody = z.object({
  elapsedSec: z.number().int().nonnegative(),
})
export type StopFocusBody = z.infer<typeof StopFocusBody>

export const SegmentBatchBody = z.object({
  segments: z.array(QualitySegmentDto).min(1).max(500),
})
export type SegmentBatchBody = z.infer<typeof SegmentBatchBody>

export const SavePlanBody = FocusPlanDto
export type SavePlanBody = z.infer<typeof SavePlanBody>

export const DayQualityDto = z.object({
  day: z.string(),
  focusedMin: z.number(),
  restMin: z.number(),
  phoneMin: z.number(),
  lapseMin: z.number(),
})
export type DayQualityDto = z.infer<typeof DayQualityDto>

export const WeeklyStatsDto = z.object({
  days: z.array(DayQualityDto),
  goalMin: z.number().int(),
  streakDays: z.number().int(),
  scoreAvg: z.number(),
  doubtsAnswered: z.number().int(),
})
export type WeeklyStatsDto = z.infer<typeof WeeklyStatsDto>

export const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type PaginationQuery = z.infer<typeof PaginationQuery>
