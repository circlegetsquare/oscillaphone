import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AudioProvider } from '../../context/AudioContext'
import ScaleSelector from './ScaleSelector'
import AudioControls from './AudioControls'
import CircleCanvas from './CircleCanvas'
import Button from '../shared/Button'
import gsap from 'gsap'

/**
 * Main BouncingCircles component
 * Integrates all subcomponents with audio context
 */
export default function BouncingCircles() {
  const [showControls, setShowControls] = useState(false)
  const [backgroundColors, setBackgroundColors] = useState([])
  const [ballSpeed, setBallSpeed] = useState(15) // Default speed matches the original INITIAL_SPEED
  const buttonRef = useRef(null)
  const buttonTimeline = useRef(null)
  
  // Handle background color changes from CircleCanvas
  const handleBackgroundChange = (colors) => {
    setBackgroundColors(colors)
  }
  
  // Generate random HSL color
  const generateRandomColor = useCallback(() => {
    const hue = Math.random() * 360
    return `hsl(${hue}, 70%, 50%)`
  }, [])
  
  // Generate random colors for button hover
  const generateRandomColors = useCallback((count = 3) => {
    return Array(count).fill().map(() => generateRandomColor())
  }, [generateRandomColor])
  
  // Generate gradient for animation
  const generateGradient = useCallback((colors, progress) => {
    // Convert HSL colors to HSLA with opacity
    const gradientColors = colors.map(color => {
      const [h, s, l] = color.match(/\d+/g)
      return `hsla(${h}, ${s}%, ${l}%, 0.7)` // Reduced opacity for better blending
    })

    // Calculate continuous rotation angles with offset
    const angles = gradientColors.map((_, i) => {
      const baseAngle = (360 / colors.length) * i // Evenly space base angles
      const rotationAngle = ((baseAngle + progress * 360) % 360).toFixed(2) // Full rotation based on progress
      return rotationAngle
    })
    
    // Build gradient string
    return `
      linear-gradient(${angles[0]}deg, ${gradientColors[0]} 0%, rgba(0,0,0,0) 70.71%),
      linear-gradient(${angles[1]}deg, ${gradientColors[1]} 0%, rgba(0,0,0,0) 70.71%),
      linear-gradient(${angles[2]}deg, ${gradientColors[2]} 0%, rgba(0,0,0,0) 70.71%)
    `.trim().replace(/\s+/g, ' ')
  }, [])
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (buttonTimeline.current) {
        buttonTimeline.current.kill()
        buttonTimeline.current = null
      }
    }
  }, [])
  
  // Handle button mouse enter
  const handleButtonMouseEnter = useCallback((e) => {
    const button = e.currentTarget
    
    // Generate new random colors for the hover effect
    const colors = generateRandomColors(3)
    
    // Kill any existing timeline
    if (buttonTimeline.current) {
      buttonTimeline.current.kill()
    }
    
    // Create animation timeline
    const timeline = gsap.timeline({ 
      repeat: -1,
      onUpdate: () => {
        const progress = timeline.progress()
        const gradient = generateGradient(colors, progress)
        button.style.background = gradient
      }
    })

    // Create a simple tween that drives the progress
    timeline.to({}, {
      duration: 4,
      ease: "none"
    })

    buttonTimeline.current = timeline
    
    // Animate text color
    gsap.to(button, {
      color: 'white',
      duration: 0.3
    })
  }, [generateRandomColors, generateGradient])
  
  // Handle button mouse leave
  const handleButtonMouseLeave = useCallback((e) => {
    const button = e.currentTarget
    
    // Kill the gradient animation
    if (buttonTimeline.current) {
      buttonTimeline.current.kill()
      buttonTimeline.current = null
    }
    
    // Reset the background and text color
    gsap.to(button, {
      background: 'transparent',
      color: '#6b21a8',
      duration: 0.3
    })
  }, [])
  
  return (
    <AudioProvider>
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10000
      }}>
        {/* Scale Selector */}
        <ScaleSelector />
        
        {/* Show Controls Button */}
        <div style={{ marginBottom: '6px' }}>
          <Button
            ref={buttonRef}
            onClick={() => setShowControls(!showControls)}
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
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={handleButtonMouseEnter}
            onMouseLeave={handleButtonMouseLeave}
          >
            <div style={{ minWidth: '110px', textAlign: 'center' }}>
              {showControls ? 'Vibe out' : 'Get weird'}
            </div>
          </Button>
        </div>

        {/* Audio Controls */}
        <AudioControls 
          visible={showControls} 
          speed={ballSpeed} 
          setSpeed={setBallSpeed} 
        />
      </div>
      
      {/* Circle Canvas */}
      <CircleCanvas 
        onBackgroundChange={handleBackgroundChange} 
        initialSpeed={ballSpeed} 
      />
    </AudioProvider>
  )
}
