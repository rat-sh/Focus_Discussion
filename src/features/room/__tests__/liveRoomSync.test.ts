import { describe, expect, it } from 'vitest'
import { decodeHandPacket, encodeHandPacket } from '../liveRoomSync'

describe('live room hand packets', () => {
  it('round-trips a raised-hand event', () => {
    const at = '2026-10-12T18:00:00.000Z'
    expect(decodeHandPacket(encodeHandPacket({ type: 'raised', at }))).toEqual({ type: 'raised', at })
  })

  it('rejects malformed and unexpected packets', () => {
    expect(decodeHandPacket(new TextEncoder().encode('not json'))).toBeNull()
    expect(decodeHandPacket(new TextEncoder().encode('{"type":"presence","userId":"x"}'))).toBeNull()
  })
})
