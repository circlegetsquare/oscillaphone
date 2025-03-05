import React from 'react'
import Button from '../shared/Button'
import { useAudio } from '../../context/AudioContext'

/**
 * Component for selecting musical scales
 */
export default function ScaleSelector() {
  const { currentScale, setCurrentScale, AVAILABLE_SCALES } = useAudio()
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        color: 'white',
        fontWeight: 'bold',
        fontSize: '16px',
        marginBottom: '8px',
        display: 'block',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Musical Scale
      </label>
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {AVAILABLE_SCALES.map(scale => (
          <Button
            key={scale.id}
            onClick={() => setCurrentScale(scale.id)}
            isActive={currentScale === scale.id}
          >
            {scale.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
