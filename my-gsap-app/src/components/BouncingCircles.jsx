import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { 
  playBeep, 
  playCollisionBeep, 
  playWallCollisionBeep, 
  calculatePan, 
  AVAILABLE_SCALES,
  WAVEFORMS, 
  setScale,
  setWallDuration,
  getWallDuration,
  setCircleDuration,
  getCircleDuration,
  setDetune,
  getDetune,
  setWaveform,
  getWaveform,
  setDelayEnabled,
  getDelayEnabled,
  setDelayTime,
  getDelayTime,
  setDelayFeedback,
  getDelayFeedback,
  setDelayMix,
  getDelayMix,
  cleanup as cleanupAudio
} from '../utils/sound'
import { checkCircleCollision, resolveCollision } from '../utils/physics'

const INITIAL_SPEED = 15 // Fixed maximum speed for new circles

// Squish animation constants
const WALL_SQUISH = {
  compress: 0.8,  // Less compression (was 0.5)
  stretch: 1.1    // Less stretch (was 1.2)
}

const CIRCLE_SQUISH = {
  compress: 0.85, // Less compression (was 0.7)
  stretch: 1.15   // Less stretch (was 1.3)
}

const controlsContainerStyles = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  zIndex: 10000
}

const scaleButtonsStyles = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap'
}

const buttonStyles = {
  padding: '8px 16px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  color: 'white',
  transition: 'background-color 0.2s',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '14px'
}

const sliderContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  padding: '12px',
  borderRadius: '4px'
}

const sliderGroupStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
}

const sliderStyles = {
  width: '200px',
  cursor: 'pointer',
  accentColor: '#9333ea'
}

const labelStyles = {
  color: 'white',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none'
}

const checkboxStyles = {
  marginRight: '8px',
  accentColor: '#9333ea',
  cursor: 'pointer'
}

export default function BouncingCircles() {
  const containerRef = useRef(null)
  const [circles, setCircles] = useState([])
  const generateInitialColors = () => {
    return Array(3).fill().map(() => {
      const hue = Math.random() * 360
      return `hsl(${hue}, 70%, 50%)`
    })
  }
  
  const [colorPalette, setColorPalette] = useState(generateInitialColors())
  const [backgroundColors, setBackgroundColors] = useState(generateInitialColors())
  const [isAnimating, setIsAnimating] = useState(true)
  const [currentScale, setCurrentScale] = useState('C_MAJOR')
  const [wallDuration, setWallDurationState] = useState(getWallDuration())
  const [circleDuration, setCircleDurationState] = useState(getCircleDuration())
  const [detune, setDetuneState] = useState(getDetune())
  const [waveform, setWaveformState] = useState(getWaveform())
  const [delayEnabled, setDelayEnabledState] = useState(getDelayEnabled())
  const [delayTime, setDelayTimeState] = useState(getDelayTime())
  const [delayFeedback, setDelayFeedbackState] = useState(getDelayFeedback())
  const [delayMix, setDelayMixState] = useState(getDelayMix())
  const circleRefs = useRef(new Map())
  const circleStates = useRef(new Map())
  const tickerFunctions = useRef(new Map())
  const collisionStates = useRef(new Map())
  const wallCollisionStates = useRef(new Map())
  const squishAnimations = useRef(new Map())
  const backgroundTimeline = useRef(null)

  const generateGradient = (colors, progress) => {
    // Convert HSL colors to HSLA with opacity
    const gradientColors = colors.map(color => {
      const [h, s, l] = color.match(/\d+/g)
      return `hsla(${h}, ${s}%, ${l}%, 0.7)` // Reduced opacity for better blending
    })

    // Calculate continuous rotation angles with offset
    const angles = gradientColors.map((_, i) => {
      const baseAngle = (360 / 3) * i // Evenly space base angles
      const rotationAngle = ((baseAngle + progress * 360) % 360).toFixed(2) // Full rotation based on progress
      return rotationAngle
    })
    
    return `
      linear-gradient(${angles[0]}deg, 
        ${gradientColors[0]} 0%, rgba(0,0,0,0) 70.71%),
      linear-gradient(${angles[1]}deg, 
        ${gradientColors[1]} 0%, rgba(0,0,0,0) 70.71%),
      linear-gradient(${angles[2]}deg, 
        ${gradientColors[2]} 0%, rgba(0,0,0,0) 70.71%)
    `.trim().replace(/\s+/g, ' ')
  }

  const addToColorPalette = (color) => {
    setColorPalette(prev => {
      const newPalette = [...prev, color]
      return newPalette.slice(-10) // Keep last 10 colors
    })
  }

  // Effect to update background colors when color palette changes
  useEffect(() => {
    if (colorPalette.length >= 3 && !isAnimating) {
      setIsAnimating(true)
      setBackgroundColors([...colorPalette.slice(-3)]) // Take last 3 colors
    }
  }, [colorPalette])

  // Effect to handle background animation
  useEffect(() => {
    if (!isAnimating || backgroundColors.length < 3) return

    // Kill any existing timeline
    if (backgroundTimeline.current) {
      backgroundTimeline.current.kill()
    }
    
    const timeline = gsap.timeline({ 
      repeat: -1,
      onUpdate: () => {
        const progress = timeline.progress()
        const gradient = generateGradient(backgroundColors, progress)
        if (containerRef.current) {
          containerRef.current.style.background = gradient
        }
      }
    })

    // Create a simple tween that drives the progress
    timeline.to({}, {
      duration: 30,
      ease: "none"
    })

    backgroundTimeline.current = timeline

    return () => {
      if (backgroundTimeline.current) {
        backgroundTimeline.current.kill()
      }
    }
  }, [isAnimating, backgroundColors])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (backgroundTimeline.current) {
        backgroundTimeline.current.kill()
      }
      tickerFunctions.current.forEach(ticker => {
        gsap.ticker.remove(ticker)
      })
      cleanupAudio()
    }
  }, [])

  const handleScaleChange = (scale) => {
    setCurrentScale(scale)
    setScale(scale)
  }

  const handleWallDurationChange = (e) => {
    const newDuration = Number(e.target.value)
    setWallDurationState(newDuration)
    setWallDuration(newDuration)
  }

  const handleCircleDurationChange = (e) => {
    const newDuration = Number(e.target.value)
    setCircleDurationState(newDuration)
    setCircleDuration(newDuration)
  }

  const handleDetuneChange = (e) => {
    const newDetune = Number(e.target.value)
    setDetuneState(newDetune)
    setDetune(newDetune)
  }

  const handleWaveformChange = (newWaveform) => {
    setWaveformState(newWaveform)
    setWaveform(newWaveform)
  }

  const handleDelayEnabledChange = (e) => {
    const enabled = e.target.checked
    setDelayEnabledState(enabled)
    setDelayEnabled(enabled)
  }

  const handleDelayTimeChange = (e) => {
    const time = Number(e.target.value)
    setDelayTimeState(time)
    setDelayTime(time)
  }

  const handleDelayFeedbackChange = (e) => {
    const amount = Number(e.target.value)
    setDelayFeedbackState(amount)
    setDelayFeedback(amount)
  }

  const handleDelayMixChange = (e) => {
    const amount = Number(e.target.value)
    setDelayMixState(amount)
    setDelayMix(amount)
  }

  const generateRandomColor = () => {
    const hue = Math.random() * 360
    const color = `hsl(${hue}, 70%, 50%)`
    addToColorPalette(color)
    return color
  }

  const generateRandomSize = () => {
    return 20 + Math.random() * 40 // Random size between 20px and 60px
  }

  const playSquishAnimation = (circleEl, direction = 'horizontal') => {
    // Kill any existing squish animation for this circle
    const existingTween = squishAnimations.current.get(circleEl)
    if (existingTween) {
      existingTween.kill()
    }

    // Create new squish animation
    const timeline = gsap.timeline()
    if (direction === 'horizontal') {
      timeline.to(circleEl, {
        scaleX: WALL_SQUISH.compress,
        scaleY: WALL_SQUISH.stretch,
        duration: 0.1,
        ease: "elastic.out(1, 0.3)"
      }).to(circleEl, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.2,
        ease: "elastic.out(1, 0.2)"
      })
    } else {
      timeline.to(circleEl, {
        scaleX: WALL_SQUISH.stretch,
        scaleY: WALL_SQUISH.compress,
        duration: 0.1,
        ease: "elastic.out(1, 0.3)"
      }).to(circleEl, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.2,
        ease: "elastic.out(1, 0.2)"
      })
    }

    squishAnimations.current.set(circleEl, timeline)
  }

  const playCircleCollisionSquish = (circleEl, otherCircleEl, angle) => {
    // Kill any existing squish animations
    const existingTween1 = squishAnimations.current.get(circleEl)
    const existingTween2 = squishAnimations.current.get(otherCircleEl)
    if (existingTween1) existingTween1.kill()
    if (existingTween2) existingTween2.kill()

    // Create new squish animation aligned with collision angle
    const timeline = gsap.timeline()
    timeline.to([circleEl, otherCircleEl], {
      scaleX: CIRCLE_SQUISH.compress,
      scaleY: CIRCLE_SQUISH.stretch,
      rotation: `${angle}rad`,
      transformOrigin: "center center",
      duration: 0.1,
      ease: "elastic.out(1, 0.3)"
    }).to([circleEl, otherCircleEl], {
      scaleX: 1,
      scaleY: 1,
      rotation: `${angle}rad`,
      duration: 0.2,
      ease: "elastic.out(1, 0.2)"
    })

    squishAnimations.current.set(circleEl, timeline)
    squishAnimations.current.set(otherCircleEl, timeline)
  }

  const handleMouseDown = (e) => {
    console.log('Mouse down event:', e.clientX, e.clientY)
    
    const bounds = containerRef.current.getBoundingClientRect()
    const id = Date.now()
    const angle = Math.random() * 360
    const size = generateRandomSize()
    const color = generateRandomColor()

    const newCircle = {
      id,
      color,
      size
    }

    setCircles(prev => [...prev, newCircle])

    // Calculate initial velocities with fixed speed
    const radians = (angle * Math.PI) / 180
    const state = {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
      vx: Math.cos(radians) * INITIAL_SPEED,
      vy: Math.sin(radians) * INITIAL_SPEED,
      radius: size / 2
    }
    circleStates.current.set(id, state)
    collisionStates.current.set(id, new Set()) // Initialize circle collision state
    wallCollisionStates.current.set(id, { x: false, y: false }) // Initialize wall collision state

    // Wait for the next render to get the circle element
    requestAnimationFrame(() => {
      const circleEl = circleRefs.current.get(id)
      if (circleEl) {
        console.log('Circle element created:', circleEl)
        
        // Set initial position
        gsap.set(circleEl, {
          xPercent: -50,
          yPercent: -50,
          x: state.x,
          y: state.y,
          transformOrigin: "center center"
        })

        // Create ticker function for continuous animation
        const tickerFunction = () => {
          if (!containerRef.current) return
          
          const bounds = containerRef.current.getBoundingClientRect()
          const currentState = {...circleStates.current.get(id)} // Create new state object
          const collisions = collisionStates.current.get(id)
          const wallCollisions = wallCollisionStates.current.get(id)
          
          // Update position based on velocity
          currentState.x += currentState.vx
          currentState.y += currentState.vy
          
          // Check for collisions with container boundaries
          const hitLeftRight = currentState.x <= currentState.radius || currentState.x >= bounds.width - currentState.radius
          const hitTopBottom = currentState.y <= currentState.radius || currentState.y >= bounds.height - currentState.radius

          if (hitLeftRight) {
            if (!wallCollisions.x) {
              const pan = calculatePan(currentState.x, bounds.width)
              playWallCollisionBeep(pan)
              playSquishAnimation(circleEl, 'horizontal')
              wallCollisions.x = true
            }
            currentState.vx *= -0.98 // Reverse direction with slight energy loss
          } else {
            wallCollisions.x = false
          }
          
          if (hitTopBottom) {
            if (!wallCollisions.y) {
              const pan = calculatePan(currentState.x, bounds.width)
              playWallCollisionBeep(pan)
              playSquishAnimation(circleEl, 'vertical')
              wallCollisions.y = true
            }
            currentState.vy *= -0.98 // Reverse direction with slight energy loss
          } else {
            wallCollisions.y = false
          }
          
          // Keep circle within bounds
          currentState.x = Math.max(currentState.radius, Math.min(currentState.x, bounds.width - currentState.radius))
          currentState.y = Math.max(currentState.radius, Math.min(currentState.y, bounds.height - currentState.radius))

          // Clear old collision states
          collisions.clear()

          // Check for collisions with other circles
          circleStates.current.forEach((otherState, otherId) => {
            if (otherId !== id) {
              const otherStateCopy = {...otherState} // Create copy of other state
              if (checkCircleCollision(
                currentState.x, currentState.y, currentState.radius,
                otherStateCopy.x, otherStateCopy.y, otherStateCopy.radius
              )) {
                // Only play sound if this is a new collision
                if (!collisions.has(otherId)) {
                  // Calculate average position for panning
                  const avgX = (currentState.x + otherStateCopy.x) / 2
                  const pan = calculatePan(avgX, bounds.width)
                  playCollisionBeep(pan)

                  // Calculate collision angle for squish animation
                  const dx = otherStateCopy.x - currentState.x
                  const dy = otherStateCopy.y - currentState.y
                  const angle = Math.atan2(dy, dx)
                  const otherCircleEl = circleRefs.current.get(otherId)
                  if (otherCircleEl) {
                    playCircleCollisionSquish(circleEl, otherCircleEl, angle)
                  }

                  collisions.add(otherId)
                  collisionStates.current.get(otherId)?.add(id)
                }
                resolveCollision(currentState, otherStateCopy)
                circleStates.current.set(otherId, otherStateCopy) // Save updated other state
              }
            }
          })
          
          // Save updated state
          circleStates.current.set(id, currentState)
          
          // Update position
          gsap.set(circleEl, {
            x: currentState.x,
            y: currentState.y
          })
        }

        // Store and start the ticker function
        tickerFunctions.current.set(id, tickerFunction)
        gsap.ticker.add(tickerFunction)
        
        console.log('Animation started for circle:', id)
      }
    })
  }

  return (
    <>
      <div style={controlsContainerStyles}>
        <div style={scaleButtonsStyles}>
          {AVAILABLE_SCALES.map(scale => (
            <button
              key={scale.id}
              onClick={() => handleScaleChange(scale.id)}
              style={{
                ...buttonStyles,
                backgroundColor: currentScale === scale.id ? '#9333ea' : '#6b21a8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7e22ce'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 
                  currentScale === scale.id ? '#9333ea' : '#6b21a8'
              }}
            >
              {scale.name}
            </button>
          ))}
        </div>
        <div style={scaleButtonsStyles}>
          {WAVEFORMS.map(wave => (
            <button
              key={wave.id}
              onClick={() => handleWaveformChange(wave.id)}
              style={{
                ...buttonStyles,
                backgroundColor: waveform === wave.id ? '#9333ea' : '#6b21a8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7e22ce'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 
                  waveform === wave.id ? '#9333ea' : '#6b21a8'
              }}
            >
              {wave.name}
            </button>
          ))}
        </div>
        <div style={sliderContainerStyles}>
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Wall Sound Duration: {wallDuration.toFixed(2)}s
            </label>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={wallDuration}
              onChange={handleWallDurationChange}
              style={sliderStyles}
            />
          </div>
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Ball Collision Duration: {circleDuration.toFixed(2)}s
            </label>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={circleDuration}
              onChange={handleCircleDurationChange}
              style={sliderStyles}
            />
          </div>
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Detune: {detune} cents
            </label>
            <input
              type="range"
              min="-1200"
              max="1200"
              step="100"
              value={detune}
              onChange={handleDetuneChange}
              style={sliderStyles}
            />
          </div>
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              <input
                type="checkbox"
                checked={delayEnabled}
                onChange={handleDelayEnabledChange}
                style={checkboxStyles}
              />
              Enable Delay
            </label>
          </div>
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Delay Time: {delayTime.toFixed(2)}s
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={delayTime}
              onChange={handleDelayTimeChange}
              style={{
                ...sliderStyles,
                opacity: delayEnabled ? 1 : 0.5,
                cursor: delayEnabled ? 'pointer' : 'not-allowed'
              }}
              disabled={!delayEnabled}
            />
          </div>
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Feedback: {(delayFeedback * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.1"
              value={delayFeedback}
              onChange={handleDelayFeedbackChange}
              style={{
                ...sliderStyles,
                opacity: delayEnabled ? 1 : 0.5,
                cursor: delayEnabled ? 'pointer' : 'not-allowed'
              }}
              disabled={!delayEnabled}
            />
          </div>
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Mix: {(delayMix * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={delayMix}
              onChange={handleDelayMixChange}
              style={{
                ...sliderStyles,
                opacity: delayEnabled ? 1 : 0.5,
                cursor: delayEnabled ? 'pointer' : 'not-allowed'
              }}
              disabled={!delayEnabled}
            />
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#1a1a1a',
          cursor: 'pointer',
          zIndex: 9999,
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        {circles.map(circle => {
          // Convert HSL to RGB for rgba background
          const div = document.createElement('div')
          div.style.color = circle.color
          document.body.appendChild(div)
          const rgbColor = window.getComputedStyle(div).color
          document.body.removeChild(div)
          
          return (
            <div
              key={circle.id}
              ref={el => circleRefs.current.set(circle.id, el)}
              style={{
                position: 'absolute',
                width: `${circle.size}px`,
                height: `${circle.size}px`,
                borderRadius: '50%',
                border: `2px solid ${circle.color}`,
                backgroundColor: rgbColor.replace('rgb', 'rgba').replace(')', ', 0.25)'),
                willChange: 'transform',
                pointerEvents: 'none'
              }}
            />
          )
        })}
      </div>
    </>
  )
}
