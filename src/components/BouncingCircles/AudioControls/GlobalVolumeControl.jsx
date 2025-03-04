import React from 'react'
import Slider from '../../shared/Slider'
import ControlPanel from '../../shared/ControlPanel'
import { useAudio } from '../../../context/AudioContext'

/**
 * Component for global volume control
 */
export default function GlobalVolumeControl() {
  const {
    globalVolume,
    setGlobalVolume
  } = useAudio()
  
  return (
    <ControlPanel title="Master Volume">
      {/* Global Volume Control */}
      <Slider
        label="Volume"
        value={globalVolume}
        onChange={setGlobalVolume}
        min={0}
        max={1.0}
        step={0.05}
        formatValue={(val) => `${(val * 100).toFixed(0)}%`}
        style={{ marginBottom: '12px' }}
      />
    </ControlPanel>
  )
}
