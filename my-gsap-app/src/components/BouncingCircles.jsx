import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { 
  playBeep, 
  playCollisionBeep, 
  playWallCollisionBeep, 
  calculatePan, 
  AVAILABLE_SCALES, 
  setScale,
  setWallDuration,
  getWallDuration,
  setCircleDuration,
  getCircleDuration
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
  gap: '8px'
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
  fontFamily: 'system-ui, sans-serif'
}

export default function BouncingCircles() {
  const containerRef = useRef(null)
  const [circles, setCircles] = useState([])
  const [currentScale, setCurrentScale] = useState('C_MAJOR')
  const [wallDuration, setWallDurationState] = useState(getWallDuration())
  const [circleDuration, setCircleDurationState] = useState(getCircleDuration())
  const circleRefs = useRef(new Map())
  const circleStates = useRef(new Map())
  const tickerFunctions = useRef(new Map())
  const collisionStates = useRef(new Map()) // Track circle collisions
  const wallCollisionStates = useRef(new Map()) // Track wall collisions
  const squishAnimations = useRef(new Map()) // Track active squish animations

  useEffect(() => {
    return () => {
      tickerFunctions.current.forEach(ticker => {
        gsap.ticker.remove(ticker)
      })
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

  const generateRandomColor = () => {
    const hue = Math.random() * 360
    return `hsl(${hue}, 70%, 50%)`
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
    const pan = calculatePan(e.clientX - bounds.left, bounds.width)
    
    // Play beep sound with panning based on click position
    playBeep(pan)
    
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
          const circle = circleEl.getBoundingClientRect()
          const state = circleStates.current.get(id)
          const collisions = collisionStates.current.get(id)
          const wallCollisions = wallCollisionStates.current.get(id)
          
          // Update position based on velocity
          state.x += state.vx
          state.y += state.vy
          
          // Check for collisions with container boundaries
          const hitLeftRight = state.x <= state.radius || state.x >= bounds.width - state.radius
          const hitTopBottom = state.y <= state.radius || state.y >= bounds.height - state.radius

          if (hitLeftRight) {
            if (!wallCollisions.x) {
              const pan = calculatePan(state.x, bounds.width)
              playWallCollisionBeep(pan)
              playSquishAnimation(circleEl, 'horizontal')
              wallCollisions.x = true
            }
            state.vx *= -0.98 // Reverse direction with slight energy loss
          } else {
            wallCollisions.x = false
          }
          
          if (hitTopBottom) {
            if (!wallCollisions.y) {
              const pan = calculatePan(state.x, bounds.width)
              playWallCollisionBeep(pan)
              playSquishAnimation(circleEl, 'vertical')
              wallCollisions.y = true
            }
            state.vy *= -0.98 // Reverse direction with slight energy loss
          } else {
            wallCollisions.y = false
          }
          
          // Keep circle within bounds
          state.x = Math.max(state.radius, Math.min(state.x, bounds.width - state.radius))
          state.y = Math.max(state.radius, Math.min(state.y, bounds.height - state.radius))

          // Clear old collision states
          collisions.clear()

          // Check for collisions with other circles
          circleStates.current.forEach((otherState, otherId) => {
            if (otherId !== id) {
              if (checkCircleCollision(
                state.x, state.y, state.radius,
                otherState.x, otherState.y, otherState.radius
              )) {
                // Only play sound if this is a new collision
                if (!collisions.has(otherId)) {
                  // Calculate average position for panning
                  const avgX = (state.x + otherState.x) / 2
                  const pan = calculatePan(avgX, bounds.width)
                  playCollisionBeep(pan)

                  // Calculate collision angle for squish animation
                  const dx = otherState.x - state.x
                  const dy = otherState.y - state.y
                  const angle = Math.atan2(dy, dx)
                  const otherCircleEl = circleRefs.current.get(otherId)
                  if (otherCircleEl) {
                    playCircleCollisionSquish(circleEl, otherCircleEl, angle)
                  }

                  collisions.add(otherId)
                  collisionStates.current.get(otherId)?.add(id)
                }
                resolveCollision(state, otherState)
              }
            }
          })
          
          gsap.set(circleEl, {
            x: state.x,
            y: state.y
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
