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
  // Wall detune parameters
  setWallDetune,
  getWallDetune,
  // Circle detune parameters
  setCircleDetune,
  getCircleDetune,
  // Legacy detune parameters
  setDetune,
  getDetune,
  // Wall waveform parameters
  setWallWaveform,
  getWallWaveform,
  // Circle waveform parameters
  setCircleWaveform,
  getCircleWaveform,
  // Legacy waveform parameters
  setWaveform,
  getWaveform,
  // Wall delay parameters
  setWallDelayEnabled,
  getWallDelayEnabled,
  setWallDelayTime,
  getWallDelayTime,
  setWallDelayFeedback,
  getWallDelayFeedback,
  setWallDelayMix,
  getWallDelayMix,
  // Circle delay parameters
  setCircleDelayEnabled,
  getCircleDelayEnabled,
  setCircleDelayTime,
  getCircleDelayTime,
  setCircleDelayFeedback,
  getCircleDelayFeedback,
  setCircleDelayMix,
  getCircleDelayMix,
  // Legacy delay parameters (for backward compatibility)
  setDelayEnabled,
  getDelayEnabled,
  setDelayTime,
  getDelayTime,
  setDelayFeedback,
  getDelayFeedback,
  setDelayMix,
  getDelayMix,
  // Wall reverb parameters
  setWallReverbEnabled,
  getWallReverbEnabled,
  setWallReverbRoomSize,
  getWallReverbRoomSize,
  setWallReverbDamping,
  getWallReverbDamping,
  setWallReverbMix,
  getWallReverbMix,
  // Circle reverb parameters
  setCircleReverbEnabled,
  getCircleReverbEnabled,
  setCircleReverbRoomSize,
  getCircleReverbRoomSize,
  setCircleReverbDamping,
  getCircleReverbDamping,
  setCircleReverbMix,
  getCircleReverbMix,
  // Legacy reverb parameters
  setReverbEnabled,
  getReverbEnabled,
  setReverbRoomSize,
  getReverbRoomSize,
  setReverbDamping,
  getReverbDamping,
  setReverbMix,
  getReverbMix,
  // Wall distortion parameters
  setWallDistortionEnabled,
  getWallDistortionEnabled,
  setWallDistortionAmount,
  getWallDistortionAmount,
  setWallDistortionOversample,
  getWallDistortionOversample,
  setWallDistortionMix,
  getWallDistortionMix,
  // Circle distortion parameters
  setCircleDistortionEnabled,
  getCircleDistortionEnabled,
  setCircleDistortionAmount,
  getCircleDistortionAmount,
  setCircleDistortionOversample,
  getCircleDistortionOversample,
  setCircleDistortionMix,
  getCircleDistortionMix,
  // Legacy distortion parameters
  setDistortionEnabled,
  getDistortionEnabled,
  setDistortionAmount,
  getDistortionAmount,
  setDistortionOversample,
  getDistortionOversample,
  setDistortionMix,
  getDistortionMix,
  // Wall volume parameters
  setWallVolume,
  getWallVolume,
  // Circle volume parameters
  setCircleVolume,
  getCircleVolume,
  // Legacy volume parameters
  setVolume,
  getVolume,
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
  const [wallDetune, setWallDetuneState] = useState(getWallDetune())
  const [circleDetune, setCircleDetuneState] = useState(getCircleDetune())
  const [wallWaveform, setWallWaveformState] = useState(getWallWaveform())
  const [circleWaveform, setCircleWaveformState] = useState(getCircleWaveform())
  // Wall delay state
  const [wallDelayEnabled, setWallDelayEnabledState] = useState(getWallDelayEnabled())
  const [wallDelayTime, setWallDelayTimeState] = useState(getWallDelayTime())
  const [wallDelayFeedback, setWallDelayFeedbackState] = useState(getWallDelayFeedback())
  const [wallDelayMix, setWallDelayMixState] = useState(getWallDelayMix())
  
  // Circle delay state
  const [circleDelayEnabled, setCircleDelayEnabledState] = useState(getCircleDelayEnabled())
  const [circleDelayTime, setCircleDelayTimeState] = useState(getCircleDelayTime())
  const [circleDelayFeedback, setCircleDelayFeedbackState] = useState(getCircleDelayFeedback())
  const [circleDelayMix, setCircleDelayMixState] = useState(getCircleDelayMix())
  
  // Wall reverb state
  const [wallReverbEnabled, setWallReverbEnabledState] = useState(getWallReverbEnabled())
  const [wallReverbRoomSize, setWallReverbRoomSizeState] = useState(getWallReverbRoomSize())
  const [wallReverbDamping, setWallReverbDampingState] = useState(getWallReverbDamping())
  const [wallReverbMix, setWallReverbMixState] = useState(getWallReverbMix())
  
  // Circle reverb state
  const [circleReverbEnabled, setCircleReverbEnabledState] = useState(getCircleReverbEnabled())
  const [circleReverbRoomSize, setCircleReverbRoomSizeState] = useState(getCircleReverbRoomSize())
  const [circleReverbDamping, setCircleReverbDampingState] = useState(getCircleReverbDamping())
  const [circleReverbMix, setCircleReverbMixState] = useState(getCircleReverbMix())
  
  // Wall distortion state
  const [wallDistortionEnabled, setWallDistortionEnabledState] = useState(getWallDistortionEnabled())
  const [wallDistortionAmount, setWallDistortionAmountState] = useState(getWallDistortionAmount())
  const [wallDistortionOversample, setWallDistortionOversampleState] = useState(getWallDistortionOversample())
  const [wallDistortionMix, setWallDistortionMixState] = useState(getWallDistortionMix())
  
  // Circle distortion state
  const [circleDistortionEnabled, setCircleDistortionEnabledState] = useState(getCircleDistortionEnabled())
  const [circleDistortionAmount, setCircleDistortionAmountState] = useState(getCircleDistortionAmount())
  const [circleDistortionOversample, setCircleDistortionOversampleState] = useState(getCircleDistortionOversample())
  const [circleDistortionMix, setCircleDistortionMixState] = useState(getCircleDistortionMix())
  
  // Volume state
  const [wallVolume, setWallVolumeState] = useState(getWallVolume())
  const [circleVolume, setCircleVolumeState] = useState(getCircleVolume())
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

  const handleWallDetuneChange = (e) => {
    const newDetune = Number(e.target.value)
    setWallDetuneState(newDetune)
    setWallDetune(newDetune)
  }

  const handleCircleDetuneChange = (e) => {
    const newDetune = Number(e.target.value)
    setCircleDetuneState(newDetune)
    setCircleDetune(newDetune)
  }

  const handleWallWaveformChange = (newWaveform) => {
    setWallWaveformState(newWaveform)
    setWallWaveform(newWaveform)
  }

  const handleCircleWaveformChange = (newWaveform) => {
    setCircleWaveformState(newWaveform)
    setCircleWaveform(newWaveform)
  }

  // Wall delay handlers
  const handleWallDelayEnabledChange = (e) => {
    const enabled = e.target.checked
    setWallDelayEnabledState(enabled)
    setWallDelayEnabled(enabled)
  }

  const handleWallDelayTimeChange = (e) => {
    const time = Number(e.target.value)
    setWallDelayTimeState(time)
    setWallDelayTime(time)
  }

  const handleWallDelayFeedbackChange = (e) => {
    const amount = Number(e.target.value)
    setWallDelayFeedbackState(amount)
    setWallDelayFeedback(amount)
  }

  const handleWallDelayMixChange = (e) => {
    const amount = Number(e.target.value)
    setWallDelayMixState(amount)
    setWallDelayMix(amount)
  }

  // Circle delay handlers
  const handleCircleDelayEnabledChange = (e) => {
    const enabled = e.target.checked
    setCircleDelayEnabledState(enabled)
    setCircleDelayEnabled(enabled)
  }

  const handleCircleDelayTimeChange = (e) => {
    const time = Number(e.target.value)
    setCircleDelayTimeState(time)
    setCircleDelayTime(time)
  }

  const handleCircleDelayFeedbackChange = (e) => {
    const amount = Number(e.target.value)
    setCircleDelayFeedbackState(amount)
    setCircleDelayFeedback(amount)
  }

  const handleCircleDelayMixChange = (e) => {
    const amount = Number(e.target.value)
    setCircleDelayMixState(amount)
    setCircleDelayMix(amount)
  }
  
  // Wall reverb handlers
  const handleWallReverbEnabledChange = (e) => {
    const enabled = e.target.checked
    setWallReverbEnabledState(enabled)
    setWallReverbEnabled(enabled)
  }
  
  const handleWallReverbRoomSizeChange = (e) => {
    const size = Number(e.target.value)
    setWallReverbRoomSizeState(size)
    setWallReverbRoomSize(size)
  }
  
  const handleWallReverbDampingChange = (e) => {
    const amount = Number(e.target.value)
    setWallReverbDampingState(amount)
    setWallReverbDamping(amount)
  }
  
  const handleWallReverbMixChange = (e) => {
    const amount = Number(e.target.value)
    setWallReverbMixState(amount)
    setWallReverbMix(amount)
  }
  
  // Circle reverb handlers
  const handleCircleReverbEnabledChange = (e) => {
    const enabled = e.target.checked
    setCircleReverbEnabledState(enabled)
    setCircleReverbEnabled(enabled)
  }
  
  const handleCircleReverbRoomSizeChange = (e) => {
    const size = Number(e.target.value)
    setCircleReverbRoomSizeState(size)
    setCircleReverbRoomSize(size)
  }
  
  const handleCircleReverbDampingChange = (e) => {
    const amount = Number(e.target.value)
    setCircleReverbDampingState(amount)
    setCircleReverbDamping(amount)
  }
  
  const handleCircleReverbMixChange = (e) => {
    const amount = Number(e.target.value)
    setCircleReverbMixState(amount)
    setCircleReverbMix(amount)
  }
  
  // Wall distortion handlers
  const handleWallDistortionEnabledChange = (e) => {
    const enabled = e.target.checked
    setWallDistortionEnabledState(enabled)
    setWallDistortionEnabled(enabled)
  }
  
  const handleWallDistortionAmountChange = (e) => {
    const amount = Number(e.target.value)
    setWallDistortionAmountState(amount)
    setWallDistortionAmount(amount)
  }
  
  const handleWallDistortionOversampleChange = (oversample) => {
    setWallDistortionOversampleState(oversample)
    setWallDistortionOversample(oversample)
  }
  
  const handleWallDistortionMixChange = (e) => {
    const amount = Number(e.target.value)
    setWallDistortionMixState(amount)
    setWallDistortionMix(amount)
  }
  
  // Circle distortion handlers
  const handleCircleDistortionEnabledChange = (e) => {
    const enabled = e.target.checked
    setCircleDistortionEnabledState(enabled)
    setCircleDistortionEnabled(enabled)
  }
  
  const handleCircleDistortionAmountChange = (e) => {
    const amount = Number(e.target.value)
    setCircleDistortionAmountState(amount)
    setCircleDistortionAmount(amount)
  }
  
  const handleCircleDistortionOversampleChange = (oversample) => {
    setCircleDistortionOversampleState(oversample)
    setCircleDistortionOversample(oversample)
  }
  
  const handleCircleDistortionMixChange = (e) => {
    const amount = Number(e.target.value)
    setCircleDistortionMixState(amount)
    setCircleDistortionMix(amount)
  }
  
  // Wall volume handler
  const handleWallVolumeChange = (e) => {
    const volume = Number(e.target.value)
    setWallVolumeState(volume)
    setWallVolume(volume)
  }
  
  // Circle volume handler
  const handleCircleVolumeChange = (e) => {
    const volume = Number(e.target.value)
    setCircleVolumeState(volume)
    setCircleVolume(volume)
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
        {/* Global Controls - Musical Scale */}
        <div style={{marginBottom: '20px'}}>
          <label style={{...labelStyles, fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', display: 'block'}}>
            Musical Scale
          </label>
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
        </div>

        {/* Wall Sound Controls */}
        <div style={{marginBottom: '20px', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px'}}>
          <label style={{...labelStyles, fontWeight: 'bold', fontSize: '16px', marginBottom: '12px', display: 'block'}}>
            Wall Sound Controls
          </label>
          
          {/* Wall Waveform */}
          <div style={{marginBottom: '16px'}}>
            <label style={{...labelStyles, fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>
              Waveform
            </label>
            <div style={scaleButtonsStyles}>
              {WAVEFORMS.map(wave => (
                <button
                  key={wave.id}
                  onClick={() => handleWallWaveformChange(wave.id)}
                  style={{
                    ...buttonStyles,
                    backgroundColor: wallWaveform === wave.id ? '#9333ea' : '#6b21a8',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7e22ce'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 
                      wallWaveform === wave.id ? '#9333ea' : '#6b21a8'
                  }}
                >
                  {wave.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Wall Volume */}
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Volume: {(wallVolume * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={wallVolume}
              onChange={handleWallVolumeChange}
              style={sliderStyles}
            />
          </div>
          
          {/* Wall Duration */}
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Duration: {wallDuration.toFixed(2)}s
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
          
          {/* Wall Detune */}
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Detune: {wallDetune} cents
            </label>
            <input
              type="range"
              min="-1200"
              max="1200"
              step="100"
              value={wallDetune}
              onChange={handleWallDetuneChange}
              style={sliderStyles}
            />
          </div>
          
          {/* Wall Delay Controls */}
          <div style={{marginTop: '16px'}}>
            <div style={sliderGroupStyles}>
              <label style={{...labelStyles, fontWeight: 'bold'}}>
                Delay Effect
              </label>
              <label style={labelStyles}>
                <input
                  type="checkbox"
                  checked={wallDelayEnabled}
                  onChange={handleWallDelayEnabledChange}
                  style={checkboxStyles}
                />
                Enable Delay
              </label>
            </div>
            
            {wallDelayEnabled && (
              <>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Delay Time: {wallDelayTime.toFixed(2)}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={wallDelayTime}
                    onChange={handleWallDelayTimeChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Feedback: {(wallDelayFeedback * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.1"
                    value={wallDelayFeedback}
                    onChange={handleWallDelayFeedbackChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Mix: {(wallDelayMix * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={wallDelayMix}
                    onChange={handleWallDelayMixChange}
                    style={sliderStyles}
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Wall Reverb Controls */}
          <div style={{marginTop: '16px'}}>
            <div style={sliderGroupStyles}>
              <label style={{...labelStyles, fontWeight: 'bold'}}>
                Reverb Effect
              </label>
              <label style={labelStyles}>
                <input
                  type="checkbox"
                  checked={wallReverbEnabled}
                  onChange={handleWallReverbEnabledChange}
                  style={checkboxStyles}
                />
                Enable Reverb
              </label>
            </div>
            
            {wallReverbEnabled && (
              <>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Room Size: {(wallReverbRoomSize * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={wallReverbRoomSize}
                    onChange={handleWallReverbRoomSizeChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Damping: {(wallReverbDamping * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={wallReverbDamping}
                    onChange={handleWallReverbDampingChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Mix: {(wallReverbMix * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={wallReverbMix}
                    onChange={handleWallReverbMixChange}
                    style={sliderStyles}
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Wall Distortion Controls */}
          <div style={{marginTop: '16px'}}>
            <div style={sliderGroupStyles}>
              <label style={{...labelStyles, fontWeight: 'bold'}}>
                Distortion Effect
              </label>
              <label style={labelStyles}>
                <input
                  type="checkbox"
                  checked={wallDistortionEnabled}
                  onChange={handleWallDistortionEnabledChange}
                  style={checkboxStyles}
                />
                Enable Distortion
              </label>
            </div>
            
            {wallDistortionEnabled && (
              <>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Amount: {(wallDistortionAmount * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={wallDistortionAmount}
                    onChange={handleWallDistortionAmountChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={{...labelStyles, marginBottom: '8px'}}>
                    Oversample: {wallDistortionOversample}
                  </label>
                  <div style={scaleButtonsStyles}>
                    {['none', '2x', '4x'].map(option => (
                      <button
                        key={option}
                        onClick={() => handleWallDistortionOversampleChange(option)}
                        style={{
                          ...buttonStyles,
                          backgroundColor: wallDistortionOversample === option ? '#9333ea' : '#6b21a8',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#7e22ce'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 
                            wallDistortionOversample === option ? '#9333ea' : '#6b21a8'
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Mix: {(wallDistortionMix * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={wallDistortionMix}
                    onChange={handleWallDistortionMixChange}
                    style={sliderStyles}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Ball Collision Sound Controls */}
        <div style={{padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px'}}>
          <label style={{...labelStyles, fontWeight: 'bold', fontSize: '16px', marginBottom: '12px', display: 'block'}}>
            Ball Collision Sound Controls
          </label>
          
          {/* Ball Waveform */}
          <div style={{marginBottom: '16px'}}>
            <label style={{...labelStyles, fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>
              Waveform
            </label>
            <div style={scaleButtonsStyles}>
              {WAVEFORMS.map(wave => (
                <button
                  key={wave.id}
                  onClick={() => handleCircleWaveformChange(wave.id)}
                  style={{
                    ...buttonStyles,
                    backgroundColor: circleWaveform === wave.id ? '#9333ea' : '#6b21a8',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7e22ce'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 
                      circleWaveform === wave.id ? '#9333ea' : '#6b21a8'
                  }}
                >
                  {wave.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Ball Volume */}
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Volume: {(circleVolume * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={circleVolume}
              onChange={handleCircleVolumeChange}
              style={sliderStyles}
            />
          </div>
          
          {/* Ball Duration */}
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Duration: {circleDuration.toFixed(2)}s
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
          
          {/* Ball Detune */}
          <div style={sliderGroupStyles}>
            <label style={labelStyles}>
              Detune: {circleDetune} cents
            </label>
            <input
              type="range"
              min="-1200"
              max="1200"
              step="100"
              value={circleDetune}
              onChange={handleCircleDetuneChange}
              style={sliderStyles}
            />
          </div>
          
          {/* Ball Delay Controls */}
          <div style={{marginTop: '16px'}}>
            <div style={sliderGroupStyles}>
              <label style={{...labelStyles, fontWeight: 'bold'}}>
                Delay Effect
              </label>
              <label style={labelStyles}>
                <input
                  type="checkbox"
                  checked={circleDelayEnabled}
                  onChange={handleCircleDelayEnabledChange}
                  style={checkboxStyles}
                />
                Enable Delay
              </label>
            </div>
            
            {circleDelayEnabled && (
              <>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Delay Time: {circleDelayTime.toFixed(2)}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={circleDelayTime}
                    onChange={handleCircleDelayTimeChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Feedback: {(circleDelayFeedback * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.1"
                    value={circleDelayFeedback}
                    onChange={handleCircleDelayFeedbackChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Mix: {(circleDelayMix * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={circleDelayMix}
                    onChange={handleCircleDelayMixChange}
                    style={sliderStyles}
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Ball Reverb Controls */}
          <div style={{marginTop: '16px'}}>
            <div style={sliderGroupStyles}>
              <label style={{...labelStyles, fontWeight: 'bold'}}>
                Reverb Effect
              </label>
              <label style={labelStyles}>
                <input
                  type="checkbox"
                  checked={circleReverbEnabled}
                  onChange={handleCircleReverbEnabledChange}
                  style={checkboxStyles}
                />
                Enable Reverb
              </label>
            </div>
            
            {circleReverbEnabled && (
              <>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Room Size: {(circleReverbRoomSize * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={circleReverbRoomSize}
                    onChange={handleCircleReverbRoomSizeChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Damping: {(circleReverbDamping * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={circleReverbDamping}
                    onChange={handleCircleReverbDampingChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Mix: {(circleReverbMix * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={circleReverbMix}
                    onChange={handleCircleReverbMixChange}
                    style={sliderStyles}
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Ball Distortion Controls */}
          <div style={{marginTop: '16px'}}>
            <div style={sliderGroupStyles}>
              <label style={{...labelStyles, fontWeight: 'bold'}}>
                Distortion Effect
              </label>
              <label style={labelStyles}>
                <input
                  type="checkbox"
                  checked={circleDistortionEnabled}
                  onChange={handleCircleDistortionEnabledChange}
                  style={checkboxStyles}
                />
                Enable Distortion
              </label>
            </div>
            
            {circleDistortionEnabled && (
              <>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Amount: {(circleDistortionAmount * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={circleDistortionAmount}
                    onChange={handleCircleDistortionAmountChange}
                    style={sliderStyles}
                  />
                </div>
                <div style={sliderGroupStyles}>
                  <label style={{...labelStyles, marginBottom: '8px'}}>
                    Oversample: {circleDistortionOversample}
                  </label>
                  <div style={scaleButtonsStyles}>
                    {['none', '2x', '4x'].map(option => (
                      <button
                        key={option}
                        onClick={() => handleCircleDistortionOversampleChange(option)}
                        style={{
                          ...buttonStyles,
                          backgroundColor: circleDistortionOversample === option ? '#9333ea' : '#6b21a8',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#7e22ce'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 
                            circleDistortionOversample === option ? '#9333ea' : '#6b21a8'
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={sliderGroupStyles}>
                  <label style={labelStyles}>
                    Mix: {(circleDistortionMix * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={circleDistortionMix}
                    onChange={handleCircleDistortionMixChange}
                    style={sliderStyles}
                  />
                </div>
              </>
            )}
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
