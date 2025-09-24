import React from 'react'
import WallControls from './WallControls'
import CircleControls from './CircleControls'
import GlobalControls from './GlobalControls'
import { useAudio } from '../../../context/AudioContext'
import Button from '../../shared/Button'

/**
 * Container component for all audio controls
 *
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the controls are visible
 * @param {number} props.speed - Current ball speed value
 * @param {Function} props.setSpeed - Function to update ball speed
 */
export default function AudioControls({ visible, speed, setSpeed }) {
  const { resetAllControls } = useAudio()

  if (!visible) return null

  const handleResetControls = () => {
    resetAllControls()
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <GlobalControls speed={speed} setSpeed={setSpeed} />

      {/* Reset Controls Button */}
      <div style={{
        padding: '0px',
        backgroundColor: 'rgba(0, 0, 0, 0.0)',
        borderRadius: '4px',
        marginBottom: '4px'
      }}>
        <Button
          onClick={handleResetControls}
          style={{
            backgroundColor: 'transparent',
            color: '#6b21a8',
            border: '2px solid #6b21a8',
            width: '100%',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#6b21a8'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#6b21a8'
          }}
        >
          Reset controls
        </Button>
      </div>

      <CircleControls />
      <WallControls />
    </div>
  )
}
