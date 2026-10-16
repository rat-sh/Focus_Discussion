import type { Participant as LiveKitParticipant, Track } from 'livekit-client'
import type { TileParticipant } from './ParticipantTile'

function trackFor(participant: LiveKitParticipant, source: Track.Source): Track | null {
  return participant.getTrackPublication(source)?.track ?? null
}

export function participantTile(
  participant: LiveKitParticipant,
  cameraSource: Track.Source,
  microphoneSource: Track.Source,
  screenShareSource: Track.Source,
): TileParticipant {
  return {
    id: participant.identity,
    name: participant.name || participant.identity,
    role: 'member',
    mic: participant.isMicrophoneEnabled,
    cam: participant.isCameraEnabled,
    speaking: participant.isSpeaking,
    handOrder: null,
    focus: null,
    screenShareTrack: trackFor(participant, screenShareSource),
    videoTrack: trackFor(participant, cameraSource),
    audioTrack: trackFor(participant, microphoneSource),
  }
}
