import React from 'react'
import EffectControls from './EffectControls'
import { useAudio } from '../../../context/AudioContext'

/**
 * Component for wall collision sound controls
 */
export default function WallControls() {
  const {
    WAVEFORMS,
    wallSettings,
    setWallWaveform,
    setWallVolume,
    setWallDuration,
    setWallDetune,
    setWallDelayEnabled,
    setWallDelayTime,
    setWallDelayFeedback,
    setWallDelayMix,
    setWallReverbEnabled,
    setWallReverbRoomSize,
    setWallReverbDamping,
    setWallReverbMix,
    setWallDistortionEnabled,
    setWallDistortionAmount,
    setWallDistortionOversample,
    setWallDistortionMix,
    setWallTremoloEnabled,
    setWallTremoloRate,
    setWallTremoloDepth,
    setWallTremoloMix
  } = useAudio()
  
  return (
    <EffectControls
      title="Wall Sound Controls"
      waveform={{
        value: wallSettings.waveform,
        onChange: setWallWaveform,
        options: WAVEFORMS
      }}
      volume={{
        value: wallSettings.volume,
        onChange: setWallVolume
      }}
      duration={{
        value: wallSettings.duration,
        onChange: setWallDuration
      }}
      detune={{
        value: wallSettings.detune,
        onChange: setWallDetune
      }}
      delay={{
        enabled: {
          value: wallSettings.delay.enabled,
          onChange: setWallDelayEnabled
        },
        time: {
          value: wallSettings.delay.time,
          onChange: setWallDelayTime
        },
        feedback: {
          value: wallSettings.delay.feedback,
          onChange: setWallDelayFeedback
        },
        mix: {
          value: wallSettings.delay.mix,
          onChange: setWallDelayMix
        }
      }}
      reverb={{
        enabled: {
          value: wallSettings.reverb.enabled,
          onChange: setWallReverbEnabled
        },
        roomSize: {
          value: wallSettings.reverb.roomSize,
          onChange: setWallReverbRoomSize
        },
        damping: {
          value: wallSettings.reverb.damping,
          onChange: setWallReverbDamping
        },
        mix: {
          value: wallSettings.reverb.mix,
          onChange: setWallReverbMix
        }
      }}
      distortion={{
        enabled: {
          value: wallSettings.distortion.enabled,
          onChange: setWallDistortionEnabled
        },
        amount: {
          value: wallSettings.distortion.amount,
          onChange: setWallDistortionAmount
        },
        oversample: {
          value: wallSettings.distortion.oversample,
          onChange: setWallDistortionOversample
        },
        mix: {
          value: wallSettings.distortion.mix,
          onChange: setWallDistortionMix
        }
      }}
      tremolo={{
        enabled: {
          value: wallSettings.tremolo.enabled,
          onChange: setWallTremoloEnabled
        },
        rate: {
          value: wallSettings.tremolo.rate,
          onChange: setWallTremoloRate
        },
        depth: {
          value: wallSettings.tremolo.depth,
          onChange: setWallTremoloDepth
        },
        mix: {
          value: wallSettings.tremolo.mix,
          onChange: setWallTremoloMix
        }
      }}
    />
  )
}
