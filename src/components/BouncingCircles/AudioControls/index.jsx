import React from 'react'
import WallControls from './WallControls'
import CircleControls from './CircleControls'
import GlobalControls from './GlobalControls'

/**
 * Container component for all audio controls
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the controls are visible
 * @param {number} props.speed - Current ball speed value
 * @param {Function} props.setSpeed - Function to update ball speed
 */
export default function AudioControls({ visible, speed, setSpeed }) {
  if (!visible) return null
  
  return (
    <>
      <GlobalControls speed={speed} setSpeed={setSpeed} />
      <WallControls />
      <CircleControls />
    </>
  )
}
