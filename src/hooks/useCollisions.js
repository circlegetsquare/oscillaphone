import { useRef, useCallback } from 'react'
import { checkCircleCollision, resolveCollision } from '../utils/physics'

/**
 * Custom hook for managing circle collisions
 * 
 * @returns {Object} Collision state and functions
 */
export function useCollisions() {
  const circleStates = useRef(new Map())
  const collisionStates = useRef(new Map())
  const wallCollisionStates = useRef(new Map())
  
  /**
   * Initialize a new circle with physics state
   * @param {string} id - Unique identifier for the circle
   * @param {Object} initialState - Initial physics state
   */
  const initCircle = useCallback((id, initialState) => {
    circleStates.current.set(id, initialState)
    collisionStates.current.set(id, new Set()) // Initialize circle collision state
    wallCollisionStates.current.set(id, { x: false, y: false }) // Initialize wall collision state
  }, [])
  
  /**
   * Remove a circle and its collision states
   * @param {string} id - Circle identifier
   */
  const removeCircle = useCallback((id) => {
    circleStates.current.delete(id)
    collisionStates.current.delete(id)
    wallCollisionStates.current.delete(id)
  }, [])
  
  /**
   * Get the current state of a circle
   * @param {string} id - Circle identifier
   * @returns {Object|null} The circle state or null if not found
   */
  const getCircleState = useCallback((id) => {
    return circleStates.current.get(id) || null
  }, [])
  
  /**
   * Update the state of a circle
   * @param {string} id - Circle identifier
   * @param {Object} state - New state object
   */
  const updateCircleState = useCallback((id, state) => {
    circleStates.current.set(id, state)
  }, [])
  
  /**
   * Check if a circle is colliding with container boundaries
   * @param {string} id - Circle identifier
   * @param {Object} bounds - Container boundaries { width, height }
   * @returns {Object} Collision result { hitLeftRight, hitTopBottom }
   */
  const checkWallCollision = useCallback((id, bounds) => {
    const state = circleStates.current.get(id)
    if (!state) return { hitLeftRight: false, hitTopBottom: false }
    
    const hitLeftRight = state.x <= state.radius || state.x >= bounds.width - state.radius
    const hitTopBottom = state.y <= state.radius || state.y >= bounds.height - state.radius
    
    return { hitLeftRight, hitTopBottom }
  }, [])
  
  /**
   * Handle wall collision for a circle
   * @param {string} id - Circle identifier
   * @param {Object} bounds - Container boundaries { width, height }
   * @returns {Object} Updated wall collision state
   */
  const handleWallCollision = useCallback((id, bounds) => {
    const state = circleStates.current.get(id)
    if (!state) return null
    
    const wallCollisions = wallCollisionStates.current.get(id) || { x: false, y: false }
    const { hitLeftRight, hitTopBottom } = checkWallCollision(id, bounds)
    
    const updatedState = { ...state }
    const updatedWallCollisions = { ...wallCollisions }
    
    if (hitLeftRight) {
      if (!wallCollisions.x) {
        updatedWallCollisions.x = true
      }
      updatedState.vx *= -0.98 // Reverse direction with slight energy loss
    } else {
      updatedWallCollisions.x = false
    }
    
    if (hitTopBottom) {
      if (!wallCollisions.y) {
        updatedWallCollisions.y = true
      }
      updatedState.vy *= -0.98 // Reverse direction with slight energy loss
    } else {
      updatedWallCollisions.y = false
    }
    
    // Keep circle within bounds
    updatedState.x = Math.max(updatedState.radius, Math.min(updatedState.x, bounds.width - updatedState.radius))
    updatedState.y = Math.max(updatedState.radius, Math.min(updatedState.y, bounds.height - updatedState.radius))
    
    // Update states
    circleStates.current.set(id, updatedState)
    wallCollisionStates.current.set(id, updatedWallCollisions)
    
    return {
      state: updatedState,
      wallCollisions: updatedWallCollisions,
      hitLeftRight,
      hitTopBottom
    }
  }, [checkWallCollision])
  
  /**
   * Check and handle collisions between all circles
   * @returns {Array} Array of collision events
   */
  const handleCircleCollisions = useCallback(() => {
    const collisionEvents = []
    const processedPairs = new Set()
    
    // Clear old collision states
    collisionStates.current.forEach((collisions, id) => {
      collisions.clear()
    })
    
    // Check each pair of circles for collisions
    circleStates.current.forEach((state1, id1) => {
      circleStates.current.forEach((state2, id2) => {
        if (id1 === id2) return // Skip self
        
        // Avoid processing the same pair twice
        const pairKey = [id1, id2].sort().join('-')
        if (processedPairs.has(pairKey)) return
        processedPairs.add(pairKey)
        
        // Check for collision
        if (checkCircleCollision(
          state1.x, state1.y, state1.radius,
          state2.x, state2.y, state2.radius
        )) {
          // Create copies of states to avoid direct mutation
          const updatedState1 = { ...state1 }
          const updatedState2 = { ...state2 }
          
          // Resolve collision physics
          resolveCollision(updatedState1, updatedState2)
          
          // Update collision states
          collisionStates.current.get(id1)?.add(id2)
          collisionStates.current.get(id2)?.add(id1)
          
          // Update circle states
          circleStates.current.set(id1, updatedState1)
          circleStates.current.set(id2, updatedState2)
          
          // Record collision event
          collisionEvents.push({
            id1,
            id2,
            state1: updatedState1,
            state2: updatedState2,
            collisionPoint: {
              x: (updatedState1.x + updatedState2.x) / 2,
              y: (updatedState1.y + updatedState2.y) / 2
            },
            angle: Math.atan2(updatedState2.y - updatedState1.y, updatedState2.x - updatedState1.x)
          })
        }
      })
    })
    
    return collisionEvents
  }, [])
  
  /**
   * Check if a circle is currently colliding with another specific circle
   * @param {string} id1 - First circle identifier
   * @param {string} id2 - Second circle identifier
   * @returns {boolean} True if the circles are colliding
   */
  const isCollidingWith = useCallback((id1, id2) => {
    return collisionStates.current.get(id1)?.has(id2) || false
  }, [])
  
  /**
   * Get all circles currently colliding with a specific circle
   * @param {string} id - Circle identifier
   * @returns {string[]} Array of colliding circle IDs
   */
  const getCollidingCircles = useCallback((id) => {
    return Array.from(collisionStates.current.get(id) || [])
  }, [])
  
  /**
   * Update positions of all circles based on their velocities
   * @param {number} deltaTime - Time elapsed since last update (in seconds)
   */
  const updatePositions = useCallback((deltaTime = 1/60) => {
    circleStates.current.forEach((state, id) => {
      const updatedState = { ...state }
      
      // Update position based on velocity
      updatedState.x += updatedState.vx * deltaTime
      updatedState.y += updatedState.vy * deltaTime
      
      circleStates.current.set(id, updatedState)
    })
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
    circleStates,
    collisionStates,
    wallCollisionStates
  }
}
