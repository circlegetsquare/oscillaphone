import { useRef, useCallback, type MutableRefObject } from 'react'
import { checkCircleCollision, resolveCollision } from '../utils/physics'
import { SpatialGrid } from '../utils/spatialGrid'
import type {
  CircleState,
  WallCollisions,
  Bounds,
  WallHitResult,
  WallCollisionResult,
  CollisionEvent,
  GridDebugInfo,
} from '../types/physics'

/**
 * Manages all physics state for bouncing circles: positions, velocities,
 * wall-collision tracking, and broad-phase collision detection via spatial grid.
 */
export function useCollisions() {
  const circleStates = useRef(new Map<string, CircleState>())
  const collisionStates = useRef(new Map<string, Set<string>>())
  const wallCollisionStates = useRef(new Map<string, WallCollisions>())
  const spatialGrid = useRef(new SpatialGrid(window.innerWidth, window.innerHeight, 100))

  const initCircle = useCallback((id: string, initialState: CircleState): void => {
    circleStates.current.set(id, initialState)
    collisionStates.current.set(id, new Set())
    wallCollisionStates.current.set(id, { x: false, y: false })
  }, [])

  const removeCircle = useCallback((id: string): void => {
    circleStates.current.delete(id)
    collisionStates.current.delete(id)
    wallCollisionStates.current.delete(id)
  }, [])

  const getCircleState = useCallback((id: string): CircleState | null => {
    return circleStates.current.get(id) ?? null
  }, [])

  const updateCircleState = useCallback((id: string, state: CircleState): void => {
    circleStates.current.set(id, state)
  }, [])

  const checkWallCollision = useCallback((id: string, bounds: Bounds): WallHitResult => {
    const state = circleStates.current.get(id)
    if (!state) return { hitLeftRight: false, hitTopBottom: false }
    return {
      hitLeftRight: state.x <= state.radius || state.x >= bounds.width - state.radius,
      hitTopBottom: state.y <= state.radius || state.y >= bounds.height - state.radius,
    }
  }, [])

  const handleWallCollision = useCallback((id: string, bounds: Bounds): WallCollisionResult | null => {
    const state = circleStates.current.get(id)
    if (!state) return null

    const wallCollisions = wallCollisionStates.current.get(id) ?? { x: false, y: false }
    const { hitLeftRight, hitTopBottom } = checkWallCollision(id, bounds)

    const updatedState: CircleState = { ...state }
    const updatedWallCollisions: WallCollisions = { ...wallCollisions }

    if (hitLeftRight) {
      updatedWallCollisions.x = true
      updatedState.vx *= -0.98
    } else {
      updatedWallCollisions.x = false
    }

    if (hitTopBottom) {
      updatedWallCollisions.y = true
      updatedState.vy *= -0.98
    } else {
      updatedWallCollisions.y = false
    }

    // Clamp within bounds
    updatedState.x = Math.max(updatedState.radius, Math.min(updatedState.x, bounds.width - updatedState.radius))
    updatedState.y = Math.max(updatedState.radius, Math.min(updatedState.y, bounds.height - updatedState.radius))

    circleStates.current.set(id, updatedState)
    wallCollisionStates.current.set(id, updatedWallCollisions)

    return { state: updatedState, wallCollisions: updatedWallCollisions, hitLeftRight, hitTopBottom }
  }, [checkWallCollision])

  /** O(n) broad-phase + narrow-phase collision detection. Returns events for all colliding pairs. */
  const handleCircleCollisions = useCallback((): CollisionEvent[] => {
    const collisionEvents: CollisionEvent[] = []
    const processedPairs = new Set<string>()

    collisionStates.current.forEach(collisions => collisions.clear())

    spatialGrid.current.clear()
    circleStates.current.forEach((state, id) => {
      spatialGrid.current.insert(id, state.x, state.y, state.radius)
    })

    circleStates.current.forEach((state1, id1) => {
      const candidates = spatialGrid.current.getPotentialCollisions(state1.x, state1.y, state1.radius)

      candidates.forEach(id2 => {
        if (id1 === id2) return

        const pairKey = [id1, id2].sort().join('-')
        if (processedPairs.has(pairKey)) return
        processedPairs.add(pairKey)

        const state2 = circleStates.current.get(id2)
        if (!state2) return

        if (checkCircleCollision(state1.x, state1.y, state1.radius, state2.x, state2.y, state2.radius)) {
          const updatedState1: CircleState = { ...state1 }
          const updatedState2: CircleState = { ...state2 }

          resolveCollision(updatedState1, updatedState2)

          collisionStates.current.get(id1)?.add(id2)
          collisionStates.current.get(id2)?.add(id1)

          circleStates.current.set(id1, updatedState1)
          circleStates.current.set(id2, updatedState2)

          collisionEvents.push({
            id1,
            id2,
            state1: updatedState1,
            state2: updatedState2,
            collisionPoint: {
              x: (updatedState1.x + updatedState2.x) / 2,
              y: (updatedState1.y + updatedState2.y) / 2,
            },
            angle: Math.atan2(updatedState2.y - updatedState1.y, updatedState2.x - updatedState1.x),
          })
        }
      })
    })

    return collisionEvents
  }, [])

  const isCollidingWith = useCallback((id1: string, id2: string): boolean => {
    return collisionStates.current.get(id1)?.has(id2) ?? false
  }, [])

  const getCollidingCircles = useCallback((id: string): string[] => {
    return Array.from(collisionStates.current.get(id) ?? [])
  }, [])

  const updatePositions = useCallback((deltaTime = 1 / 60): void => {
    circleStates.current.forEach((state, id) => {
      circleStates.current.set(id, {
        ...state,
        x: state.x + state.vx * deltaTime,
        y: state.y + state.vy * deltaTime,
      })
    })
  }, [])

  const updateSpatialGrid = useCallback((width: number, height: number): void => {
    spatialGrid.current.updateDimensions(width, height)
  }, [])

  const getSpatialGridDebug = useCallback((): GridDebugInfo => {
    return spatialGrid.current.getDebugInfo()
  }, [])

  return {
    initCircle,
    removeCircle,
    getCircleState,
    updateCircleState,
    checkWallCollision,
    handleWallCollision,
    handleCircleCollisions,
    isCollidingWith,
    getCollidingCircles,
    updatePositions,
    updateSpatialGrid,
    getSpatialGridDebug,
    circleStates: circleStates as MutableRefObject<Map<string, CircleState>>,
    collisionStates: collisionStates as MutableRefObject<Map<string, Set<string>>>,
    wallCollisionStates: wallCollisionStates as MutableRefObject<Map<string, WallCollisions>>,
  }
}
