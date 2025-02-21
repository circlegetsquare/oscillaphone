import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { playBeep, playCollisionBeep, playWallCollisionBeep, calculatePan } from '../utils/sound'
import { checkCircleCollision, resolveCollision } from '../utils/physics'

export default function BouncingCircles() {
  const containerRef = useRef(null)
  const [circles, setCircles] = useState([])
  const circleRefs = useRef(new Map())
  const circleStates = useRef(new Map())
  const tickerFunctions = useRef(new Map())
  const collisionStates = useRef(new Map()) // Track circle collisions
  const wallCollisionStates = useRef(new Map()) // Track wall collisions

  useEffect(() => {
    return () => {
      tickerFunctions.current.forEach(ticker => {
        gsap.ticker.remove(ticker)
      })
    }
  }, [])

  const generateRandomColor = () => {
    return `hsl(${Math.random() * 360}, 70%, 50%)`
  }

  const generateRandomSize = () => {
    return 20 + Math.random() * 40 // Random size between 20px and 60px
  }

  const handleMouseDown = (e) => {
    console.log('Mouse down event:', e.clientX, e.clientY)
    
    const bounds = containerRef.current.getBoundingClientRect()
    const pan = calculatePan(e.clientX - bounds.left, bounds.width)
    
    // Play beep sound with panning based on click position
    playBeep(pan)
    
    const id = Date.now()
    const angle = Math.random() * 360
    const speed = 5 + Math.random() * 10
    const size = generateRandomSize()

    const newCircle = {
      id,
      color: generateRandomColor(),
      size
    }

    setCircles(prev => [...prev, newCircle])

    // Calculate initial velocities
    const radians = (angle * Math.PI) / 180
    const state = {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
      vx: Math.cos(radians) * speed,
      vy: Math.sin(radians) * speed,
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
          y: state.y
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
      {circles.map(circle => (
        <div
          key={circle.id}
          ref={el => circleRefs.current.set(circle.id, el)}
          style={{
            position: 'absolute',
            width: `${circle.size}px`,
            height: `${circle.size}px`,
            borderRadius: '50%',
            backgroundColor: circle.color,
            willChange: 'transform',
            pointerEvents: 'none'
          }}
        />
      ))}
    </div>
  )
}
