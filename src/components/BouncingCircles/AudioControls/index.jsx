import React from 'react'
import WallControls from './WallControls'
import CircleControls from './CircleControls'
import GlobalVolumeControl from './GlobalVolumeControl'

/**
 * Container component for all audio controls
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the controls are visible
 */
export default function AudioControls({ visible }) {
  if (!visible) return null
  
  return (
    <>
      <GlobalVolumeControl />
      <WallControls />
      <CircleControls />
    </>
  )
}
