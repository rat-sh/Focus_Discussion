import { z } from 'zod'

const HandPacket = z.discriminatedUnion('type', [
  z.object({ type: z.literal('request') }),
  z.object({ type: z.literal('raised'), at: z.string().datetime() }),
  z.object({ type: z.literal('lowered') }),
])

export type LiveHandPacket = z.infer<typeof HandPacket>
export const LIVE_HAND_TOPIC = 'studyroom.hand.v1'

export function encodeHandPacket(packet: LiveHandPacket): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(packet))
}

export function decodeHandPacket(payload: Uint8Array): LiveHandPacket | null {
  try {
    const parsed = HandPacket.safeParse(JSON.parse(new TextDecoder().decode(payload)))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
