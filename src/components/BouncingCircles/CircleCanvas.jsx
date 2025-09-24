import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react'
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
 * Convert HSL color to RGBA with alpha - memoized to avoid DOM operations
 * @param {string} hslColor - HSL color string
 * @returns {string} RGBA color string with 0.25 alpha
 */
const colorCache = new Map()
const convertHSLToRGBA = (hslColor) => {
  if (colorCache.has(hslColor)) {
    return colorCache.get(hslColor)
  }

  // Create temporary element for color conversion
  const div = document.createElement('div')
  div.style.color = hslColor
  document.body.appendChild(div)
  const rgbColor = window.getComputedStyle(div).color
  document.body.removeChild(div)

  // Convert to rgba
  const rgbaColor = rgbColor.replace('rgb', 'rgba').replace(')', ', 0.25)')

  // Cache the result
  colorCache.set(hslColor, rgbaColor)

  return rgbaColor
}

/**
 * Memoized Circle component to prevent unnecessary re-renders
 */
const Circle = React.memo(({ id, state, onRef }) => {
  const backgroundColor = convertHSLToRGBA(state.color)

  return (
    <div
      key={id}
      ref={onRef}
      style={{
        position: 'absolute',
        width: `${state.radius * 2}px`,
        height: `${state.radius * 2}px`,
        borderRadius: '50%',
        color: state.color,
        border: `2px solid ${state.color}`,
        backgroundColor,
        boxShadow: '0 0 0px 0px',
        animationFillMode: 'forwards',
        willChange: 'transform',
        pointerEvents: 'none'
      }}
    />
  )
})

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
  const glowAnimations = useRef(new Map())

  // React state for rendering circles (separate from physics state)
  const [renderCircles, setRenderCircles] = useState(new Map())
  
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
    updateSpatialGrid,
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

      // Kill all glow animations
      glowAnimations.current.forEach((tween) => {
        if (tween) {
          tween.kill();
        }
      });
      glowAnimations.current.clear();
    };
  }, []);

  // Update spatial grid dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      updateSpatialGrid(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [updateSpatialGrid])

  /**
   * Generate a random size for a new circle
   * @returns {number} Random size between 20px and 60px
   */
  const generateRandomSize = useCallback(() => {
    return 20 + Math.random() * 40
  }, [])

  /**
   * Add a circle to the render state (separate from physics)
   */
  const addCircleToRender = useCallback((id, state) => {
    setRenderCircles(prev => new Map(prev).set(id, state))
  }, [])

  /**
   * Remove a circle from the render state
   */
  const removeCircleFromRender = useCallback((id) => {
    setRenderCircles(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }, [])

  /**
   * Memoized callback for handling circle refs
   */
  const handleCircleRef = useCallback((id) => (el) => {
    if (el) {
      circleRefs.current.set(id, el)
    } else {
      circleRefs.current.delete(id)
    }
  }, [])

  /**
   * Memoized array of circle components
   */
  const circleComponents = useMemo(() => {
    return Array.from(renderCircles.entries()).map(([id, state]) => (
      <Circle
        key={id}
        id={id}
        state={state}
        onRef={handleCircleRef(id)}
      />
    ))
  }, [renderCircles, handleCircleRef])
  
  /**
   * Play squish animation for wall collision
   * @param {HTMLElement} circleEl - Circle element
   * @param {string} direction - 'horizontal' or 'vertical'
   */
  const playSquishAnimation = useCallback((circleEl, direction = 'horizontal', velocity = 0) => {
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
  }, [])
  
  /**
   * Play squish animation for circle collision
   * @param {HTMLElement} circleEl - First circle element
   * @param {HTMLElement} otherCircleEl - Second circle element
   * @param {number} angle - Collision angle in radians
   */
  const playCircleCollisionSquish = useCallback((circleEl, otherCircleEl, angle, state1, state2) => {
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
          // Add glow effect proportional to circle size using GSAP
          const circleRadius = parseFloat(el.style.width) / 2 || 30 // fallback to 30px
          const glowSpread = Math.max(8, circleRadius * 0.8) // minimum 8px, or 80% of radius
          const glowBlur = Math.max(2, circleRadius * 0.2) // minimum 2px, or 20% of radius

          // Kill any existing glow animation for this element
          const existingGlow = glowAnimations.current.get(el)
          if (existingGlow) {
            existingGlow.kill()
          }

          // Set initial glow state (restart the glow)
          el.style.boxShadow = `0 0 ${glowSpread}px ${glowBlur}px inset ${color}`

          // Animate the glow fade with GSAP for better easing control
          const glowTween = gsap.to(el, {
            boxShadow: `0 0 0px 0px inset ${color}`,
            duration: 1.8,
            ease: "power2.out",
            delay: 0.3, // Small delay to let the glow be visible first
            onComplete: () => {
              // Remove from tracking when complete
              glowAnimations.current.delete(el)
            }
          })

          // Track this glow animation
          glowAnimations.current.set(el, glowTween)
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
  }, [])
  
  /**
   * Handle mouse down event to create a new circle
   * @param {React.MouseEvent} e - Mouse event
   */
  const handleMouseDown = useCallback((e) => {
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

    // Add circle to render state for React rendering
    addCircleToRender(id, initialState)
    
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

          // Add glow effect for wall collisions
          const circleRadius = updatedState.radius
          const glowSpread = Math.max(8, circleRadius * 0.8)
          const glowBlur = Math.max(2, circleRadius * 0.2)
          const color = updatedState.color

          // Kill any existing glow animation for this element
          const existingGlow = glowAnimations.current.get(circleEl)
          if (existingGlow) {
            existingGlow.kill()
          }

          // Set initial glow state (restart the glow)
          circleEl.style.boxShadow = `0 0 ${glowSpread}px ${glowBlur}px inset ${color}`

          // Animate the glow fade with GSAP for better easing control
          const glowTween = gsap.to(circleEl, {
            boxShadow: `0 0 0px 0px inset ${color}`,
            duration: 1.8,
            ease: "power2.out",
            delay: 0.3,
            onComplete: () => {
              // Remove from tracking when complete
              glowAnimations.current.delete(circleEl)
            }
          })

          // Track this glow animation
          glowAnimations.current.set(circleEl, glowTween)
          
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
            const velocity = hitLeftRight ? Math.abs(updatedState.vx) : Math.abs(updatedState.vy);
            playWallCollisionBeep(pan, velocity);
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
  }, [initialSpeed, generateRandomSize, generateRandomColor, addToColorPalette, initCircle, getCircleState, updateCircleState, handleWallCollision, addTicker, playSquishAnimation, addCircleToRender])
  
  // Track last collision time for each pair of circles using a ref to persist across re-renders
  const lastCollisionTimes = useRef(new Map());
  // Cooldown period in milliseconds
  const COLLISION_COOLDOWN = 300;
  
  // Handle circle collisions in animation frame with idle detection
  useEffect(() => {
    let animationId = null

    const handleCollisions = () => {
      if (!containerRef.current) {
        animationId = requestAnimationFrame(handleCollisions)
        return
      }

      // Check if there are any circles - if not, pause collision detection
      if (circleStates.current.size === 0) {
        // Schedule next check in 100ms instead of next frame to save CPU
        setTimeout(() => {
          animationId = requestAnimationFrame(handleCollisions)
        }, 100)
        return
      }

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
            // Calculate relative velocity magnitude
            const dvx = state2.vx - state1.vx;
            const dvy = state2.vy - state1.vy;
            const relativeVelocity = Math.sqrt(dvx * dvx + dvy * dvy);
            playCollisionBeep(pan, relativeVelocity);

            // Update the last collision time
            lastCollisionTimes.current.set(pairKey, currentTime);
          }
        }
      })

      // Request next frame for active collision detection
      animationId = requestAnimationFrame(handleCollisions)
    }

    // Start collision detection loop
    animationId = requestAnimationFrame(handleCollisions)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
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
                box-shadow: 0 0 var(--glow-spread, 12px) var(--glow-blur, 2px) inset currentColor;
              }
              100% {
                box-shadow: 0 0 0 0 currentColor;
              }
            }
          `}
        </style>
        
        {circleComponents}
      </div>
    </>
  )
}
