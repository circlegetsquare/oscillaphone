import { useRef, useEffect, useMemo, useCallback, useState, memo } from 'react'
import gsap from 'gsap'
import { useAnimationState } from '../../hooks/useAnimationState'
import { useCollisions } from '../../hooks/useCollisions'
import { useColorPalette } from '../../hooks/useColorPalette'
import {
  playCollisionBeep,
  playWallCollisionBeep,
  calculatePan,
  resumeAudioContext
} from '../../utils/sound'
import { useAudio } from '../../context/AudioContext'
import type { CircleState } from '../../types/physics'
import type { SoundSettings } from '../../types/audio'

// ── Squish animation constants ──────────────────────────────────────────────

const SQUISH_LIMITS = {
  MIN_VELOCITY: 5,
  MAX_VELOCITY: 30,
  MIN_COMPRESS: 0.90,
  MAX_COMPRESS: 0.67,
  MIN_STRETCH: 1.06,
  MAX_STRETCH: 1.22,
} as const

const mapVelocityToSquish = (velocity: number, minVal: number, maxVal: number): number => {
  const absVelocity = Math.abs(velocity)
  const clampedVelocity = Math.min(Math.max(absVelocity, SQUISH_LIMITS.MIN_VELOCITY), SQUISH_LIMITS.MAX_VELOCITY)
  const velocityProgress =
    (clampedVelocity - SQUISH_LIMITS.MIN_VELOCITY) /
    (SQUISH_LIMITS.MAX_VELOCITY - SQUISH_LIMITS.MIN_VELOCITY)
  return minVal + (maxVal - minVal) * velocityProgress
}

const calculateSquishAmounts = (velocity: number): { compress: number; stretch: number } => ({
  compress: mapVelocityToSquish(velocity, SQUISH_LIMITS.MIN_COMPRESS, SQUISH_LIMITS.MAX_COMPRESS),
  stretch:  mapVelocityToSquish(velocity, SQUISH_LIMITS.MIN_STRETCH,  SQUISH_LIMITS.MAX_STRETCH),
})

// ── HSL → RGBA conversion (memoised, no DOM ops) ────────────────────────────

const colorCache = new Map<string, string>()
const COLOR_CACHE_MAX = 200

const convertHSLToRGBA = (hslColor: string): string => {
  const cached = colorCache.get(hslColor)
  if (cached) return cached

  const digits = hslColor.match(/[\d.]+/g) ?? ['0', '70', '50']
  const [h, s, l] = digits.map(Number)
  const sn = s / 100
  const ln = l / 100
  const c  = (1 - Math.abs(2 * ln - 1)) * sn
  const x  = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m  = ln - c / 2
  let r = 0, g = 0, b = 0
  if      (h < 60)  { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  const ri = Math.round((r + m) * 255)
  const gi = Math.round((g + m) * 255)
  const bi = Math.round((b + m) * 255)
  const result = `rgba(${ri}, ${gi}, ${bi}, 0.25)`

  if (colorCache.size >= COLOR_CACHE_MAX) {
    colorCache.delete(colorCache.keys().next().value!)
  }
  colorCache.set(hslColor, result)
  return result
}

// ── Circle sub-component ────────────────────────────────────────────────────

interface CircleProps {
  id: string
  state: Pick<CircleState, 'color' | 'radius'>
  onRef: (el: HTMLDivElement | null) => void
}

const Circle = memo<CircleProps>(({ id, state, onRef }) => {
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
        border: `1px solid ${state.color}`,
        backgroundColor,
        boxShadow: '0 0 0px 0px',
        animationFillMode: 'forwards',
        willChange: 'transform',
        pointerEvents: 'none',
      }}
    />
  )
})
Circle.displayName = 'Circle'

// ── Max balls cap ────────────────────────────────────────────────────────────

const MAX_BALLS = 50

// ── Squish animation data ────────────────────────────────────────────────────

interface SquishData {
  timeline: gsap.core.Timeline
  startTime: number
  expectedEndTime: number
}

// ── Main component ────────────────────────────────────────────────────────────

interface CircleCanvasProps {
  onBackgroundChange?: (colors: string[]) => void
  initialSpeed?: number
}

function CircleCanvas({ onBackgroundChange, initialSpeed = 15 }: CircleCanvasProps) {
  const { wallSettings, circleSettings } = useAudio()

  // Refs so long-lived closures always read fresh settings
  const wallSettingsRef  = useRef<SoundSettings>(wallSettings)
  const circleSettingsRef = useRef<SoundSettings>(circleSettings)
  useEffect(() => { wallSettingsRef.current  = wallSettings  }, [wallSettings])
  useEffect(() => { circleSettingsRef.current = circleSettings }, [circleSettings])

  const containerRef    = useRef<HTMLDivElement | null>(null)
  /** Cached viewport-sized bounds; container is `position: fixed; inset: 0`,
   *  so width/height match the viewport and left/top are always 0. */
  const boundsRef       = useRef({ width: window.innerWidth, height: window.innerHeight })
  const circleRefs      = useRef(new Map<string, HTMLDivElement>())
  const squishAnimations = useRef(new Map<HTMLDivElement, SquishData>())
  const glowAnimations  = useRef(new Map<HTMLDivElement, gsap.core.Tween>())
  /** Set of active shockwave ring divs; used for cleanup on unmount. */
  const shockwaveElements = useRef(new Set<HTMLDivElement>())
  /** FIFO queue of spawned ball ids; used for MAX_BALLS eviction */
  const ballIdsRef      = useRef<string[]>([])
  /** Per-pair collision cooldown tracking */
  const lastCollisionTimes = useRef(new Map<string, number>())

  const [renderCircles, setRenderCircles] = useState(new Map<string, Pick<CircleState, 'color' | 'radius'>>())

  const { createTimeline, addTicker, removeTicker } = useAnimationState()

  const {
    initCircle,
    removeCircle,
    getCircleState,
    updateCircleState,
    handleWallCollision,
    handleCircleCollisions,
    updateSpatialGrid,
    circleStates,
  } = useCollisions()

  const {
    colorPalette,
    backgroundColors,
    generateRandomColor,
    addToColorPalette,
    generateGradient,
    updateBackgroundColors,
  } = useColorPalette()

  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const latestBackgroundColorsRef = useRef<string[]>(backgroundColors)

  useEffect(() => {
    latestBackgroundColorsRef.current = backgroundColors
  }, [backgroundColors])

  // Background gradient animation — runs once
  useEffect(() => {
    if (!timelineRef.current) {
      timelineRef.current = createTimeline('background', {
        repeat: -1,
        onUpdate: () => {
          if (!timelineRef.current) return
          const progress = timelineRef.current.progress()
          const gradient = generateGradient(latestBackgroundColorsRef.current, progress)
          if (containerRef.current) {
            containerRef.current.style.background = gradient
          }
        },
      })
      timelineRef.current.to({}, { duration: 30, ease: 'none' })
    }
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill()
        timelineRef.current = null
      }
    }
  }, [createTimeline, generateGradient])

  // Notify parent of background colors
  useEffect(() => {
    if (onBackgroundChange) onBackgroundChange(backgroundColors)
  }, [backgroundColors, onBackgroundChange])

  // Seed background colors once palette is ready
  useEffect(() => {
    if (colorPalette.length >= 3 && backgroundColors.length === 0) {
      updateBackgroundColors(3)
    }
  }, [colorPalette, backgroundColors.length, updateBackgroundColors])

  // Cleanup stale squish/glow animations periodically
  useEffect(() => {
    const squishAnim = squishAnimations.current
    const glowAnim   = glowAnimations.current
    const CLEANUP_INTERVAL = 1000
    const GRACE_PERIOD     = 500

    const cleanupAnimations = () => {
      const now = Date.now()
      squishAnim.forEach((data, element) => {
        if (now > data.expectedEndTime + GRACE_PERIOD) {
          data.timeline.kill()
          gsap.set(element, { scaleX: 1, scaleY: 1, rotation: 0 })
          squishAnim.delete(element)
        }
      })
    }

    const intervalId = setInterval(cleanupAnimations, CLEANUP_INTERVAL)
    const shockwaves = shockwaveElements.current
    return () => {
      clearInterval(intervalId)
      squishAnim.forEach(data => data.timeline.kill())
      squishAnim.clear()
      glowAnim.forEach(tween => { if (tween) tween.kill() })
      glowAnim.clear()
      shockwaves.forEach(el => { gsap.killTweensOf(el); el.remove() })
      shockwaves.clear()
    }
  }, [])

  // Spatial grid + cached bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      boundsRef.current = { width: window.innerWidth, height: window.innerHeight }
      updateSpatialGrid(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateSpatialGrid])

  const generateRandomSize = useCallback((): number => 40 + Math.random() * 50, [])

  const addCircleToRender = useCallback((id: string, state: Pick<CircleState, 'color' | 'radius'>) => {
    setRenderCircles(prev => new Map(prev).set(id, state))
  }, [])

  const removeCircleFromRender = useCallback((id: string) => {
    setRenderCircles(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  /**
   * Fully remove a ball: stop its GSAP ticker, clear physics + render state,
   * kill any in-flight squish/glow animations, and drop its DOM ref.
   */
  const removeBall = useCallback((id: string) => {
    removeTicker(id)
    removeCircle(id)
    removeCircleFromRender(id)

    // Prune cooldown map entries involving this ball
    lastCollisionTimes.current.forEach((_, key) => {
      if (key.startsWith(id + '-') || key.endsWith('-' + id)) {
        lastCollisionTimes.current.delete(key)
      }
    })

    const el = circleRefs.current.get(id)
    if (el) {
      squishAnimations.current.get(el)?.timeline.kill()
      squishAnimations.current.delete(el)
      glowAnimations.current.get(el)?.kill()
      glowAnimations.current.delete(el)
      circleRefs.current.delete(id)
    }
  }, [removeTicker, removeCircle, removeCircleFromRender])

  const handleCircleRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) circleRefs.current.set(id, el)
      else    circleRefs.current.delete(id)
    },
    []
  )

  const circleComponents = useMemo(
    () =>
      Array.from(renderCircles.entries()).map(([id, state]) => (
        <Circle key={id} id={id} state={state} onRef={handleCircleRef(id)} />
      )),
    [renderCircles, handleCircleRef]
  )

  /**
   * Expanding ring at the collision point. Radiates outward from (x, y),
   * fading as it grows. Velocity scales radius and opacity.
   */
  const playShockwave = useCallback(
    (x: number, y: number, color: string, velocity: number, startRadius: number) => {
      const container = containerRef.current
      if (!container) return

      if (Math.abs(velocity) < 0) return
      const t = Math.min(Math.max((Math.abs(velocity) - 3) / 17, 0), 1)
      // Ring starts at the outer edge of both balls and expands from there
      const startDiameter = startRadius * 2
      const extraRadius   = 25 + t * 75        // 25→100px of travel beyond the balls
      const maxDiameter   = startDiameter + extraRadius * 2
      const duration      = 0.18 + t * 0.42    // 0.18→0.60s
      const startOpacity  = 0.35 + t * 0.65    // 0.35→1.0
      const borderWidth   = 1.0 + t * 3.0      // 1.0→4px

      const ring = document.createElement('div')
      ring.style.cssText = [
        'position:absolute',
        `left:${x}px`,
        `top:${y}px`,
        'width:2px',
        'height:2px',
        'border-radius:50%',
        `border:${borderWidth.toFixed(1)}px solid ${color}`,
        'transform:translate(-50%,-50%)',
        'pointer-events:none',
        'will-change:transform,opacity',
      ].join(';')
      container.appendChild(ring)
      shockwaveElements.current.add(ring)

      gsap.set(ring, { width: startDiameter, height: startDiameter, opacity: startOpacity })
      gsap.to(ring, {
        width: maxDiameter,
        height: maxDiameter,
        opacity: 0,
        duration,
        ease: 'power2.out',
        onComplete: () => {
          ring.remove()
          shockwaveElements.current.delete(ring)
        },
      })
    },
    []
  )

  /**
   * Fill flash on collision. Uses CSS `filter: brightness()` so the flash
   * affects the entire ball (fill, border, inset glow) and can't be masked
   * by the box-shadow from playGlow. Velocity scales peak brightness and
   * fade duration; hard hits ramp toward near-white.
   */
  const flashTweenRef = useRef(new WeakMap<HTMLDivElement, gsap.core.Tween>())
  const playFillFlash = useCallback(
    (el: HTMLDivElement, _color: string, velocity: number) => {
      const t = Math.min(Math.max((Math.abs(velocity) - 5) / 20, 0), 1)
      const peakBrightness = 1.5 + t * 2.0    // 1.5× soft → 3.5× hard
      const fadeDuration   = 0.25 + t * 0.45   // 0.25s soft → 0.70s hard

      // Kill only the previous fill-flash tween, not squish/glow
      flashTweenRef.current.get(el)?.kill()

      const tween = gsap.fromTo(
        el,
        { filter: `brightness(${peakBrightness})` },
        {
          filter: 'brightness(1)',
          duration: fadeDuration,
          ease: 'power2.out',
          onComplete: () => { flashTweenRef.current.delete(el) },
        }
      )
      flashTweenRef.current.set(el, tween)
    },
    []
  )

  /**
   * Trigger an inset glow on a single circle. Used by both wall and ball
   * collisions. Velocity drives spread/blur, hold time, and decay duration
   * via a single 0..1 factor (clamped to [0.4, 1.4] for visual breathing room).
   */
  const playGlow = useCallback(
    (el: HTMLDivElement, color: string, radius: number, velocity: number) => {
      const absV = Math.abs(velocity)
      // Map velocity 5..25 → 0..1 (saturates earlier so avg hits feel punchy),
      // then expand to 0.2..1.8 for a wider soft-to-hard range.
      const t = Math.min(Math.max((absV - 5) / 20, 0), 1)
      const vf = 0.2 + t * 1.6

      const glowSpread = Math.max(6, radius * 1.0 * vf)
      const glowBlur   = Math.max(2, radius * 0.3 * vf)
      const holdDelay  = 0.25 * vf     // 0.05s soft → 0.45s hard
      const fadeDur    = 1.6 * vf      // 0.32s soft → 2.88s hard

      glowAnimations.current.get(el)?.kill()
      el.style.boxShadow = `0 0 ${glowSpread}px ${glowBlur}px inset ${color}`
      const glowTween = gsap.to(el, {
        boxShadow: `0 0 0px 0px inset ${color}`,
        duration: fadeDur,
        ease: 'power2.out',
        delay: holdDelay,
        onComplete: () => { glowAnimations.current.delete(el) },
      })
      glowAnimations.current.set(el, glowTween)
    },
    []
  )

  /**
   * Unified jello-squish builder. Oscillates `{scaleX, scaleY}` past the rest
   * pose `N` times, with each wobble's amplitude damped by `WOBBLE_DAMPING`,
   * then settles to (1, 1, 0). Wobble count scales 2 → 10 with velocity.
   * Records timing in `squishAnimations` so the cleanup interval can reap
   * stale entries.
   */
  const runSquish = useCallback(
    (
      el: HTMLDivElement,
      opts: { velocity: number; scaleX: number; scaleY: number; rotation?: number }
    ) => {
      squishAnimations.current.get(el)?.timeline.kill()
      gsap.set(el, { scaleX: 1, scaleY: 1, rotation: 0 })

      const absV = Math.abs(opts.velocity)
      const velocityFactor = Math.min(Math.max(absV / SQUISH_LIMITS.MAX_VELOCITY, 0.5), 1)
      const segmentDuration = 0.06 * (1 / velocityFactor)

      // Wobble count scales 2 → 10 with velocity
      const MIN_WOBBLES = 2
      const MAX_WOBBLES = 10
      const wobbleProgress = Math.min(Math.max((absV - 5) / 25, 0), 1) // 5 → 30 → 0..1
      const wobbles = Math.round(MIN_WOBBLES + (MAX_WOBBLES - MIN_WOBBLES) * wobbleProgress)
      const WOBBLE_DAMPING = 0.80

      // Deformation relative to rest
      const dx = opts.scaleX - 1
      const dy = opts.scaleY - 1

      const timeline = gsap.timeline({
        onComplete: () => {
          gsap.set(el, { scaleX: 1, scaleY: 1, rotation: 0 })
          squishAnimations.current.delete(el)
        },
      })

      for (let i = 0; i < wobbles; i++) {
        const amp = Math.pow(-WOBBLE_DAMPING, i)
        const step: gsap.TweenVars = {
          scaleX: 1 + dx * amp,
          scaleY: 1 + dy * amp,
          duration: segmentDuration,
          ease: i === 0 ? 'power2.out' : 'sine.inOut',
        }
        if (i === 0 && opts.rotation !== undefined) {
          step.rotation = `${opts.rotation}rad`
          step.transformOrigin = 'center center'
        } else if (i === 1 && opts.rotation !== undefined) {
          step.rotation = 0
        }
        timeline.to(el, step)
      }

      // Final settle to exact rest
      timeline.to(el, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: segmentDuration * 0.8,
        ease: 'sine.out',
      })

      const now = Date.now()
      const totalMs = (wobbles + 0.8) * segmentDuration * 1000
      squishAnimations.current.set(el, {
        timeline,
        startTime: now,
        expectedEndTime: now + totalMs,
      })
      return timeline
    },
    []
  )

  /** Wall-collision squish animation */
  const playSquishAnimation = useCallback(
    (circleEl: HTMLDivElement, direction: 'horizontal' | 'vertical' = 'horizontal', velocity = 0) => {
      const { compress, stretch } = calculateSquishAmounts(velocity)
      if (direction === 'horizontal') {
        runSquish(circleEl, { velocity, scaleX: compress, scaleY: stretch })
      } else {
        runSquish(circleEl, { velocity, scaleX: stretch, scaleY: compress })
      }
    },
    [runSquish]
  )

  /** Ball-collision squish + glow animation for both circles */
  const playCircleCollisionSquish = useCallback(
    (
      circleEl: HTMLDivElement,
      otherCircleEl: HTMLDivElement,
      angle: number,
      state1: CircleState,
      state2: CircleState
    ) => {
      const dvx = state2.vx - state1.vx
      const dvy = state2.vy - state1.vy
      const relativeVelocity = Math.sqrt(dvx * dvx + dvy * dvy)
      const { compress, stretch } = calculateSquishAmounts(relativeVelocity)

      const animateOne = (el: HTMLDivElement, color: string, radius: number) => {
        runSquish(el, {
          velocity: relativeVelocity,
          scaleX: compress,
          scaleY: stretch,
          rotation: angle,
        })
        playGlow(el, color, radius, relativeVelocity)
        playFillFlash(el, color, relativeVelocity)
      }

      animateOne(circleEl,      state1.color, state1.radius)
      animateOne(otherCircleEl, state2.color, state2.radius)
    },
    [runSquish, playGlow, playFillFlash]
  )

  /** Spawn a ball at canvas-relative coordinates */
  const spawnBallAt = useCallback(
    (x: number, y: number) => {
      if (!containerRef.current) return

      // FIFO eviction when at cap
      while (ballIdsRef.current.length >= MAX_BALLS) {
        const oldestId = ballIdsRef.current.shift()
        if (oldestId !== undefined) removeBall(oldestId)
      }

      const angle  = Math.random() * 360
      const size   = generateRandomSize()
      const color  = generateRandomColor()
      addToColorPalette(color)
      const radians = (angle * Math.PI) / 180
      const id = `${Date.now()}-${ballIdsRef.current.length}`

      const initialState: CircleState = {
        x,
        y,
        vx: Math.cos(radians) * initialSpeed,
        vy: Math.sin(radians) * initialSpeed,
        radius: size / 2,
        color,
      }

      ballIdsRef.current.push(id)
      initCircle(id, initialState)
      addCircleToRender(id, { color, radius: initialState.radius })

      requestAnimationFrame(() => {
        const circleEl = circleRefs.current.get(id)
        if (!circleEl) return

        gsap.set(circleEl, { xPercent: -50, yPercent: -50, x, y, transformOrigin: 'center center' })

        const lastWallCollisionTime = { x: 0, y: 0 }
        const WALL_COLLISION_COOLDOWN = 300

        const tickerFunction = () => {
          if (!containerRef.current) return
          const bounds = boundsRef.current
          const currentState = getCircleState(id)
          if (!currentState) return

          const updatedState: CircleState = {
            ...currentState,
            x: currentState.x + currentState.vx,
            y: currentState.y + currentState.vy,
          }
          updateCircleState(id, updatedState)

          const wallResult = handleWallCollision(id, bounds)
          const hitLeftRight  = wallResult?.hitLeftRight  ?? false
          const hitTopBottom  = wallResult?.hitTopBottom  ?? false
          const currentTime   = Date.now()

          if (hitLeftRight || hitTopBottom) {
            const wallVelocity = hitLeftRight ? Math.abs(updatedState.vx) : Math.abs(updatedState.vy)
            if (hitLeftRight) {
              playSquishAnimation(circleEl, 'horizontal', wallVelocity)
            } else {
              playSquishAnimation(circleEl, 'vertical', wallVelocity)
            }

            // Glow + fill flash on wall hit
            playGlow(circleEl, updatedState.color, updatedState.radius, wallVelocity)
            playFillFlash(circleEl, updatedState.color, wallVelocity)

            // Sound cooldown
            let shouldPlaySound = false
            if (hitLeftRight && currentTime - lastWallCollisionTime.x > WALL_COLLISION_COOLDOWN) {
              lastWallCollisionTime.x = currentTime
              shouldPlaySound = true
            }
            if (hitTopBottom && currentTime - lastWallCollisionTime.y > WALL_COLLISION_COOLDOWN) {
              lastWallCollisionTime.y = currentTime
              shouldPlaySound = true
            }

            if (shouldPlaySound) {
              const pan      = calculatePan(updatedState.x, bounds.width)
              const velocity = hitLeftRight ? Math.abs(updatedState.vx) : Math.abs(updatedState.vy)
              playWallCollisionBeep(pan, velocity, wallSettingsRef.current)
            }
          }

          const finalState = getCircleState(id)
          if (!finalState) return
          gsap.set(circleEl, { x: finalState.x, y: finalState.y })
        }

        addTicker(id, tickerFunction)
      })
    },
    [
      initialSpeed,
      generateRandomSize,
      generateRandomColor,
      addToColorPalette,
      initCircle,
      getCircleState,
      updateCircleState,
      handleWallCollision,
      addTicker,
      playSquishAnimation,
      playGlow,      playFillFlash,      addCircleToRender,
      removeBall,
    ]
  )

  const handleMouseDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      resumeAudioContext()
      if (!containerRef.current) return
      // Container is `position: fixed; inset: 0`, so client coords map directly.
      spawnBallAt(e.clientX, e.clientY)
    },
    [spawnBallAt]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.code === 'Space' || e.key === ' ') {
        resumeAudioContext()
        e.preventDefault()
        if (!containerRef.current) return
        const { width, height } = boundsRef.current
        spawnBallAt(Math.random() * width, Math.random() * height)
      }
    },
    [spawnBallAt]
  )

  const COLLISION_COOLDOWN = 300

  // Ball-ball collision detection rAF loop
  useEffect(() => {
    let animationId: number | null = null

    const handleCollisions = () => {
      if (!containerRef.current) {
        animationId = requestAnimationFrame(handleCollisions)
        return
      }

      if (circleStates.current.size === 0) {
        setTimeout(() => { animationId = requestAnimationFrame(handleCollisions) }, 100)
        return
      }

      const bounds = boundsRef.current
      const collisionEvents = handleCircleCollisions()
      const currentTime = Date.now()

      collisionEvents.forEach(event => {
        const { id1, id2, collisionPoint, angle } = event
        const pairKey   = [id1, id2].sort().join('-')
        const circleEl1 = circleRefs.current.get(id1)
        const circleEl2 = circleRefs.current.get(id2)

        if (circleEl1 && circleEl2) {
          const lastCollisionTime  = lastCollisionTimes.current.get(pairKey) ?? 0
          const timeSinceLast      = currentTime - lastCollisionTime
          const state1 = circleStates.current.get(id1)
          const state2 = circleStates.current.get(id2)

          if (state1 && state2) {
            playCircleCollisionSquish(circleEl1, circleEl2, angle, state1, state2)
            const dvx0 = (state2.vx) - (state1.vx)
            const dvy0 = (state2.vy) - (state1.vy)
            const rv = Math.sqrt(dvx0 * dvx0 + dvy0 * dvy0)
            playShockwave(collisionPoint.x, collisionPoint.y, state1.color, rv, state1.radius + state2.radius)
          }

          if (timeSinceLast > COLLISION_COOLDOWN) {
            const pan = calculatePan(collisionPoint.x, bounds.width)
            const dvx = (state2?.vx ?? 0) - (state1?.vx ?? 0)
            const dvy = (state2?.vy ?? 0) - (state1?.vy ?? 0)
            const relativeVelocity = Math.sqrt(dvx * dvx + dvy * dvy)
            playCollisionBeep(pan, relativeVelocity, circleSettingsRef.current)
            lastCollisionTimes.current.set(pairKey, currentTime)
          }
        }
      })

      animationId = requestAnimationFrame(handleCollisions)
    }

    animationId = requestAnimationFrame(handleCollisions)
    return () => { if (animationId !== null) cancelAnimationFrame(animationId) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleCircleCollisions, playCircleCollisionSquish, playShockwave])

  return (
    <>
      <div
        ref={containerRef}
        role="application"
        aria-label="Oscillaphone canvas — click or press Space to spawn a ball"
        tabIndex={0}
        onPointerDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#05080f',
          cursor: 'pointer',
          zIndex: 9999,
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          outline: 'none',
        }}
      >
        <style>
          {`
            @keyframes collisionGlow {
              0%   { box-shadow: 0 0 var(--glow-spread, 12px) var(--glow-blur, 2px) inset currentColor; }
              100% { box-shadow: 0 0 0 0 currentColor; }
            }
          `}
        </style>
        {circleComponents}
      </div>
    </>
  )
}

export default memo(CircleCanvas)
