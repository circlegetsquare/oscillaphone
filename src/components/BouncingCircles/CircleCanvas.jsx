import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useAnimationState } from '../../hooks/useAnimationState'
import { useCollisions } from '../../hooks/useCollisions'
import { useColorPalette } from '../../hooks/useColorPalette'
import { 
  playCollisionBeep, 
  playWallCollisionBeep, 
  calculatePan 
} from '../../utils/sound'

// Squish animation constants
const SQUISH_LIMITS = {
  MIN_VELOCITY: 5,    // Minimum velocity to start scaling squish
  MAX_VELOCITY: 30,   // Velocity at which max squish is reached
  MIN_COMPRESS: 0.9,  // Minimum compression (least squish)
  MAX_COMPRESS: 0.6,  // Maximum compression (most squish)
  MIN_STRETCH: 1.05,  // Minimum stretch
  MAX_STRETCH: 1.2    // Maximum stretch
}

/**
 * Map a velocity to a squish amount
 * @param {number} velocity - The velocity to map
 * @param {number} minVal - Minimum output value
 * @param {number} maxVal - Maximum output value
 * @returns {number} Mapped squish amount
 */
const mapVelocityToSquish = (velocity, minVal, maxVal) => {
  // Get the absolute velocity
  const absVelocity = Math.abs(velocity)
  
  // Clamp velocity between min and max
  const clampedVelocity = Math.min(Math.max(absVelocity, SQUISH_LIMITS.MIN_VELOCITY), SQUISH_LIMITS.MAX_VELOCITY)
  
  // Calculate how far between min and max velocity we are (0 to 1)
  const velocityProgress = (clampedVelocity - SQUISH_LIMITS.MIN_VELOCITY) / 
    (SQUISH_LIMITS.MAX_VELOCITY - SQUISH_LIMITS.MIN_VELOCITY)
  
  // Lerp between min and max values
  return minVal + (maxVal - minVal) * velocityProgress
}

/**
 * Calculate squish amounts based on velocity
 * @param {number} velocity - The collision velocity
 * @returns {{compress: number, stretch: number}} Squish amounts
 */
const calculateSquishAmounts = (velocity) => {
  return {
    compress: mapVelocityToSquish(velocity, SQUISH_LIMITS.MIN_COMPRESS, SQUISH_LIMITS.MAX_COMPRESS),
    stretch: mapVelocityToSquish(velocity, SQUISH_LIMITS.MIN_STRETCH, SQUISH_LIMITS.MAX_STRETCH)
  }
}

/**
 * Component for rendering and animating circles
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onBackgroundChange - Callback when background colors change
 * @param {number} props.initialSpeed - Initial speed for new circles
 */
export default function CircleCanvas({ onBackgroundChange, initialSpeed = 15 }) {
  const containerRef = useRef(null)
  const circleRefs = useRef(new Map())
  const squishAnimations = useRef(new Map())
  
  // Custom hooks
  const {
    createTimeline,
    addTicker,
    removeTicker,
    setAnimationState,
    getAnimationState
  } = useAnimationState()
  
  const {
    initCircle,
    removeCircle,
    getCircleState,
    updateCircleState,
    handleWallCollision,
    handleCircleCollisions,
    updatePositions,
    circleStates
  } = useCollisions()
  
  const {
    colorPalette,
    backgroundColors,
    generateRandomColor,
    addToColorPalette,
    generateGradient,
    updateBackgroundColors,
    setBackgroundColors
  } = useColorPalette()
  
  // Store the timeline in a ref to persist across re-renders
  const timelineRef = useRef(null)
  // Store the latest background colors in a ref to access in the timeline
  const latestBackgroundColorsRef = useRef(backgroundColors)
  
  // Update the latest background colors ref when backgroundColors changes
  useEffect(() => {
    latestBackgroundColorsRef.current = backgroundColors
  }, [backgroundColors])
  
  // Initialize background animation only once
  useEffect(() => {
    // Create the timeline only if it doesn't exist
    if (!timelineRef.current) {
      timelineRef.current = createTimeline('background', { 
        repeat: -1,
        onUpdate: () => {
          const progress = timelineRef.current.progress()
          // Use the latest background colors from the ref
          const gradient = generateGradient(latestBackgroundColorsRef.current, progress)
          if (containerRef.current) {
            containerRef.current.style.background = gradient
          }
        }
      })
      
      // Create a simple tween that drives the progress
      timelineRef.current.to({}, {
        duration: 30,
        ease: "none"
      })
    }
    
    // Cleanup on unmount
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill()
        timelineRef.current = null
      }
    }
  }, [createTimeline, generateGradient]) // Only run on mount and when these dependencies change
  
  // Update the background colors and notify parent
  useEffect(() => {
    // Notify parent component of background colors
    if (onBackgroundChange) {
      onBackgroundChange(backgroundColors)
    }
  }, [backgroundColors, onBackgroundChange])
  
  // Initialize background colors once
  useEffect(() => {
    if (colorPalette.length >= 3 && backgroundColors.length === 0) {
      updateBackgroundColors(3)
    }
  }, [colorPalette, backgroundColors.length, updateBackgroundColors])
  
  // Cleanup animations periodically
  useEffect(() => {
    const CLEANUP_INTERVAL = 1000; // Check every second
    const GRACE_PERIOD = 500; // Extra time to allow for animations to complete

    const cleanupAnimations = () => {
      const now = Date.now();
      squishAnimations.current.forEach((data, element) => {
        // Check if animation has exceeded its expected duration (plus grace period)
        if (now > data.expectedEndTime + GRACE_PERIOD) {
          // Kill the animation
          if (data.timeline) {
            data.timeline.kill();
          }
          // Reset the element's transform properties
          gsap.set(element, {
            scaleX: 1,
            scaleY: 1,
            rotation: 0
          });
          // Remove from the animations map
          squishAnimations.current.delete(element);
        }
      });
    };

    // Start the cleanup interval
    const intervalId = setInterval(cleanupAnimations, CLEANUP_INTERVAL);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
      // Kill all remaining animations
      squishAnimations.current.forEach((data) => {
        if (data.timeline) {
          data.timeline.kill();
        }
      });
      squishAnimations.current.clear();
    };
  }, []);
  
  /**
   * Generate a random size for a new circle
   * @returns {number} Random size between 20px and 60px
   */
  const generateRandomSize = () => {
    return 20 + Math.random() * 40
  }
  
  /**
   * Play squish animation for wall collision
   * @param {HTMLElement} circleEl - Circle element
   * @param {string} direction - 'horizontal' or 'vertical'
   */
  const playSquishAnimation = (circleEl, direction = 'horizontal', velocity = 0) => {
    // Kill any existing animation for this circle
    const existingTween = squishAnimations.current.get(circleEl)
    if (existingTween && existingTween.timeline) {
      existingTween.timeline.kill()
    }

    // Reset transform properties before starting new animation
    gsap.set(circleEl, {
      scaleX: 1,
      scaleY: 1,
      rotation: 0
    })

    // Calculate squish amounts based on velocity
    const { compress, stretch } = calculateSquishAmounts(velocity)

    // Create new squish animation
    const timeline = gsap.timeline({
      onComplete: () => {
        // Ensure circle returns to normal state
        gsap.set(circleEl, {
          scaleX: 1,
          scaleY: 1,
          rotation: 0
        })
        // Remove from animations map when complete
        squishAnimations.current.delete(circleEl)
      }
    })

    // Scale animation duration based on velocity (faster collisions = quicker animations)
    const velocityFactor = Math.min(Math.max(Math.abs(velocity) / SQUISH_LIMITS.MAX_VELOCITY, 0.5), 1)
    const squishDuration = 0.1 * (1 / velocityFactor)
    const returnDuration = 0.2 * (1 / velocityFactor)

    if (direction === 'horizontal') {
      timeline.to(circleEl, {
        scaleX: compress,
        scaleY: stretch,
        duration: squishDuration,
        ease: "elastic.out(1, 0.1)"
      }).to(circleEl, {
        scaleX: 1,
        scaleY: 1,
        duration: returnDuration,
        ease: "elastic.out(1, 0.2)",
        delay: 0.05 // Small delay before returning to normal
      })
    } else {
      timeline.to(circleEl, {
        scaleX: stretch,
        scaleY: compress,
        duration: squishDuration,
        ease: "elastic.out(1, 0.3)"
      }).to(circleEl, {
        scaleX: 1,
        scaleY: 1,
        duration: returnDuration,
        ease: "elastic.out(1, 0.2)",
        delay: 0.05 // Small delay before returning to normal
      })
    }

    // Store timeline with metadata
    const now = Date.now()
    const expectedDuration = (squishDuration + 0.05 + returnDuration) * 1000 // Convert to milliseconds
    
    squishAnimations.current.set(circleEl, {
      timeline: timeline,
      startTime: now,
      expectedEndTime: now + expectedDuration
    })
  }
  
  /**
   * Play squish animation for circle collision
   * @param {HTMLElement} circleEl - First circle element
   * @param {HTMLElement} otherCircleEl - Second circle element
   * @param {number} angle - Collision angle in radians
   */
  const playCircleCollisionSquish = (circleEl, otherCircleEl, angle, state1, state2) => {
    // Calculate relative velocity magnitude for squish amount
    const dvx = state2.vx - state1.vx
    const dvy = state2.vy - state1.vy
    const relativeVelocity = Math.sqrt(dvx * dvx + dvy * dvy)

    // Function to create a timeline for a single circle
    const createCircleTimeline = (el, color, velocity) => {
      // Kill any existing animation for this circle
      const existingTween = squishAnimations.current.get(el)
      if (existingTween && existingTween.timeline) {
        existingTween.timeline.kill()
      }

      // Reset transform properties before starting new animation
      gsap.set(el, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      })

      // Calculate squish amounts based on velocity
      const { compress, stretch } = calculateSquishAmounts(velocity)

      // Create new squish animation
      const timeline = gsap.timeline({
        onComplete: () => {
          // Ensure circle returns to normal state
          gsap.set(el, {
            scaleX: 1,
            scaleY: 1,
            rotation: 0
          })
          // Remove from animations map when complete
          squishAnimations.current.delete(el)
        }
      })

      // Scale animation duration based on velocity (faster collisions = quicker animations)
      const velocityFactor = Math.min(Math.max(Math.abs(velocity) / SQUISH_LIMITS.MAX_VELOCITY, 0.5), 1)
      const squishDuration = 0.1 * (1 / velocityFactor)
      const returnDuration = 0.2 * (1 / velocityFactor)

      timeline.to(el, {
        scaleX: compress,
        scaleY: stretch,
        rotation: `${angle}rad`,
        transformOrigin: "center center",
        duration: squishDuration,
        ease: "elastic.out(1, 0.3)",
        onStart: () => {
          // Add glow effect
          el.style.animation = 'none'
          void el.offsetWidth
          el.style.boxShadow = `0 0 0 0 ${color}`
          el.style.animation = 'collisionGlow .8s ease-out forwards'
        }
      }).to(el, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: returnDuration,
        ease: "elastic.out(1, 0.2)",
        delay: 0.05 // Small delay before returning to normal
      })

      return timeline
    }

    // Get the colors for glow effects
    const color1 = window.getComputedStyle(circleEl).borderColor
    const color2 = window.getComputedStyle(otherCircleEl).borderColor

    // Create independent timelines for each circle with relative velocity
    const timeline1 = createCircleTimeline(circleEl, color1, relativeVelocity)
    const timeline2 = createCircleTimeline(otherCircleEl, color2, relativeVelocity)

    // Store timelines with metadata
    const now = Date.now()
    const velocityFactor = Math.min(Math.max(relativeVelocity / SQUISH_LIMITS.MAX_VELOCITY, 0.5), 1)
    const squishDuration = 0.1 * (1 / velocityFactor)
    const returnDuration = 0.2 * (1 / velocityFactor)
    const expectedDuration = (squishDuration + 0.05 + returnDuration) * 1000 // Convert to milliseconds
    
    squishAnimations.current.set(circleEl, {
      timeline: timeline1,
      startTime: now,
      expectedEndTime: now + expectedDuration
    })
    
    squishAnimations.current.set(otherCircleEl, {
      timeline: timeline2,
      startTime: now,
      expectedEndTime: now + expectedDuration
    })
  }
  
  /**
   * Handle mouse down event to create a new circle
   * @param {React.MouseEvent} e - Mouse event
   */
  const handleMouseDown = (e) => {
    if (!containerRef.current) return
    
    const bounds = containerRef.current.getBoundingClientRect()
    const id = Date.now().toString()
    const angle = Math.random() * 360
    const size = generateRandomSize()
    const color = generateRandomColor()
    
    // Add color to palette
    addToColorPalette(color)
    
    // Calculate initial velocities with the current speed setting
    const radians = (angle * Math.PI) / 180
    const initialState = {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
      vx: Math.cos(radians) * initialSpeed,
      vy: Math.sin(radians) * initialSpeed,
      radius: size / 2,
      color
    }
    
    // Initialize circle in physics system
    initCircle(id, initialState)
    
    // Wait for the next render to get the circle element
    requestAnimationFrame(() => {
      const circleEl = circleRefs.current.get(id)
      if (!circleEl) return
      
      // Set initial position
      gsap.set(circleEl, {
        xPercent: -50,
        yPercent: -50,
        x: initialState.x,
        y: initialState.y,
        transformOrigin: "center center"
      })
      
      // Track last wall collision time
      const lastWallCollisionTime = { x: 0, y: 0 };
      // Cooldown period in milliseconds
      const WALL_COLLISION_COOLDOWN = 300;
      
      // Create ticker function for continuous animation
      const tickerFunction = () => {
        if (!containerRef.current) return
        
        const bounds = containerRef.current.getBoundingClientRect()
        const currentState = getCircleState(id)
        if (!currentState) return
        
        // Update position based on velocity
        const updatedState = { ...currentState }
        updatedState.x += updatedState.vx
        updatedState.y += updatedState.vy
        
        // Update state in physics system
        updateCircleState(id, updatedState)
        
        // Handle wall collisions
        const { hitLeftRight, hitTopBottom } = handleWallCollision(id, bounds)
        
        const currentTime = Date.now();
        
        // Play wall collision sound if needed
        if (hitLeftRight || hitTopBottom) {
          // Always play squish animation with velocity
          if (hitLeftRight) {
            playSquishAnimation(circleEl, 'horizontal', Math.abs(updatedState.vx))
          } else if (hitTopBottom) {
            playSquishAnimation(circleEl, 'vertical', Math.abs(updatedState.vy))
          }
          
          // Check if enough time has passed since the last collision
          let shouldPlaySound = false;
          
          if (hitLeftRight) {
            const timeSinceLastCollision = currentTime - lastWallCollisionTime.x;
            if (timeSinceLastCollision > WALL_COLLISION_COOLDOWN) {
              lastWallCollisionTime.x = currentTime;
              shouldPlaySound = true;
            }
          }
          
          if (hitTopBottom) {
            const timeSinceLastCollision = currentTime - lastWallCollisionTime.y;
            if (timeSinceLastCollision > WALL_COLLISION_COOLDOWN) {
              lastWallCollisionTime.y = currentTime;
              shouldPlaySound = true;
            }
          }
          
          // Only play sound if cooldown has passed
          if (shouldPlaySound) {
            const pan = calculatePan(updatedState.x, bounds.width);
            playWallCollisionBeep(pan);
          }
        }
        
        // Get the updated state after collision handling
        const finalState = getCircleState(id)
        if (!finalState) return
        
        // Update position in DOM
        gsap.set(circleEl, {
          x: finalState.x,
          y: finalState.y
        })
      }
      
      // Add ticker function
      addTicker(id, tickerFunction)
    })
  }
  
  // Track last collision time for each pair of circles using a ref to persist across re-renders
  const lastCollisionTimes = useRef(new Map());
  // Cooldown period in milliseconds
  const COLLISION_COOLDOWN = 300;
  
  // Handle circle collisions in animation frame
  useEffect(() => {
    
    const handleCollisions = () => {
      if (!containerRef.current) return
      
      const bounds = containerRef.current.getBoundingClientRect()
      const collisionEvents = handleCircleCollisions()
      const currentTime = Date.now();
      
      // Process collision events
      collisionEvents.forEach(event => {
        const { id1, id2, collisionPoint, angle } = event
        
        // Create a unique key for this pair of circles
        const pairKey = [id1, id2].sort().join('-');
        
        // Get circle elements
        const circleEl1 = circleRefs.current.get(id1)
        const circleEl2 = circleRefs.current.get(id2)
        
        if (circleEl1 && circleEl2) {
          // Check if enough time has passed since the last collision
          const lastCollisionTime = lastCollisionTimes.current.get(pairKey) || 0;
          const timeSinceLastCollision = currentTime - lastCollisionTime;
          
          // Get the states of both circles
          const state1 = circleStates.current.get(id1)
          const state2 = circleStates.current.get(id2)
          
          // Always play the squish animation with velocity
          playCircleCollisionSquish(circleEl1, circleEl2, angle, state1, state2);
          
          // Only play the sound if enough time has passed
          if (timeSinceLastCollision > COLLISION_COOLDOWN) {
            const pan = calculatePan(collisionPoint.x, bounds.width);
            playCollisionBeep(pan);
            
            // Update the last collision time
            lastCollisionTimes.current.set(pairKey, currentTime);
          }
        }
      })
      
      // Request next frame
      requestAnimationFrame(handleCollisions)
    }
    
    // Start collision detection loop
    const animationId = requestAnimationFrame(handleCollisions)
    
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [handleCircleCollisions, playCircleCollisionSquish, calculatePan, playCollisionBeep])
  
  return (
    <>
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
        <style>
          {`
            @keyframes collisionGlow {
              0% {
                box-shadow: 0 0 12px 2px inset currentColor;
              }
              100% {
                box-shadow: 0 0 0 0 currentColor;
              }
            }
          `}
        </style>
        
        {Array.from(circleStates.current.entries()).map(([id, state]) => {
          // Convert HSL to RGB for rgba background
          const div = document.createElement('div')
          div.style.color = state.color
          document.body.appendChild(div)
          const rgbColor = window.getComputedStyle(div).color
          document.body.removeChild(div)
          
          return (
            <div
              key={id}
              ref={el => {
                if (el) circleRefs.current.set(id, el)
                else circleRefs.current.delete(id)
              }}
              style={{
                position: 'absolute',
                width: `${state.radius * 2}px`,
                height: `${state.radius * 2}px`,
                borderRadius: '50%',
                color: state.color,
                border: `2px solid ${state.color}`,
                backgroundColor: rgbColor.replace('rgb', 'rgba').replace(')', ', 0.25)'),
                boxShadow: '0 0 0px 0px',
                animationFillMode: 'forwards',
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
