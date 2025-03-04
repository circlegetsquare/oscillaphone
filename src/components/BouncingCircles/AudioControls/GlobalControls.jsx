import React from 'react'
import Slider from '../../shared/Slider'
import ControlPanel from '../../shared/ControlPanel'
import { useAudio } from '../../../context/AudioContext'

/**
 * Component for global controls including volume and ball speed
 * 
 * @param {Object} props - Component props
 * @param {number} props.speed - Current ball speed value
 * @param {Function} props.setSpeed - Function to update ball speed
 */
export default function GlobalControls({ speed, setSpeed }) {
  const {
    globalVolume,
    setGlobalVolume
  } = useAudio()
  
  return (
    <ControlPanel>
      {/* Global Volume Control */}
      <Slider
        label="Master Volume"
        value={globalVolume}
        onChange={setGlobalVolume}
        min={0}
        max={1.0}
        step={0.05}
        formatValue={(val) => `${(val * 100).toFixed(0)}%`}
        style={{ marginBottom: '12px' }}
      />
      
      {/* Ball Speed Control */}
      <Slider
        label="Ball Speed"
        value={speed}
        onChange={setSpeed}
        min={5}
        max={30}
        step={1}
        formatValue={(val) => `${val}`}
      />
    </ControlPanel>
  )
}
