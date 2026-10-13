import { useEffect } from 'react'
import type { TileParticipant } from './ParticipantTile'

function AudioTrack({ track }: { track: NonNullable<TileParticipant['audioTrack']> }) {
  useEffect(() => {
    const element = track.attach()
    element.autoplay = true
    element.setAttribute('aria-hidden', 'true')
    document.body.append(element)
    return () => {
      track.detach(element)
      element.remove()
    }
  }, [track])

  return null
}

export function LiveAudioTracks({ participants, userId }: { participants: TileParticipant[]; userId: string }) {
  const withAudio = participants.filter(
    (participant): participant is TileParticipant & { audioTrack: NonNullable<TileParticipant['audioTrack']> } =>
      participant.id !== userId && participant.mic && participant.audioTrack !== null && participant.audioTrack !== undefined,
  )
  return withAudio.map((participant) => <AudioTrack key={participant.id} track={participant.audioTrack} />)
}
