import React from 'react'
import EffectControls from './EffectControls'
import { useAudio } from '../../../context/AudioContext'

/**
 * Component for circle collision sound controls
 */
export default function CircleControls() {
  const {
    WAVEFORMS,
    circleSettings,
    setCircleWaveform,
    setCircleVolume,
    setCircleDuration,
    setCircleDetune,
    setCircleDelayEnabled,
    setCircleDelayTime,
    setCircleDelayFeedback,
    setCircleDelayMix,
    setCircleReverbEnabled,
    setCircleReverbRoomSize,
    setCircleReverbDamping,
    setCircleReverbMix,
    setCircleDistortionEnabled,
    setCircleDistortionAmount,
    setCircleDistortionOversample,
    setCircleDistortionMix,
    setCircleTremoloEnabled,
    setCircleTremoloRate,
    setCircleTremoloDepth,
    setCircleTremoloMix
  } = useAudio()
  
  return (
    <EffectControls
      title="Ball Collision Sound Controls"
      waveform={{
        value: circleSettings.waveform,
        onChange: setCircleWaveform,
        options: WAVEFORMS
      }}
      volume={{
        value: circleSettings.volume,
        onChange: setCircleVolume
      }}
      duration={{
        value: circleSettings.duration,
        onChange: setCircleDuration
      }}
      detune={{
        value: circleSettings.detune,
        onChange: setCircleDetune
      }}
      delay={{
        enabled: {
          value: circleSettings.delay.enabled,
          onChange: setCircleDelayEnabled
        },
        time: {
          value: circleSettings.delay.time,
          onChange: setCircleDelayTime
        },
        feedback: {
          value: circleSettings.delay.feedback,
          onChange: setCircleDelayFeedback
        },
        mix: {
          value: circleSettings.delay.mix,
          onChange: setCircleDelayMix
        }
      }}
      reverb={{
        enabled: {
          value: circleSettings.reverb.enabled,
          onChange: setCircleReverbEnabled
        },
        roomSize: {
          value: circleSettings.reverb.roomSize,
          onChange: setCircleReverbRoomSize
        },
        damping: {
          value: circleSettings.reverb.damping,
          onChange: setCircleReverbDamping
        },
        mix: {
          value: circleSettings.reverb.mix,
          onChange: setCircleReverbMix
        }
      }}
      distortion={{
        enabled: {
          value: circleSettings.distortion.enabled,
          onChange: setCircleDistortionEnabled
        },
        amount: {
          value: circleSettings.distortion.amount,
          onChange: setCircleDistortionAmount
        },
        oversample: {
          value: circleSettings.distortion.oversample,
          onChange: setCircleDistortionOversample
        },
        mix: {
          value: circleSettings.distortion.mix,
          onChange: setCircleDistortionMix
        }
      }}
      tremolo={{
        enabled: {
          value: circleSettings.tremolo.enabled,
          onChange: setCircleTremoloEnabled
        },
        rate: {
          value: circleSettings.tremolo.rate,
          onChange: setCircleTremoloRate
        },
        depth: {
          value: circleSettings.tremolo.depth,
          onChange: setCircleTremoloDepth
        },
        mix: {
          value: circleSettings.tremolo.mix,
          onChange: setCircleTremoloMix
        }
      }}
    />
  )
}
