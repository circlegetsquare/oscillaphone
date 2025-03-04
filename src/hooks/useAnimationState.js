import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'

/**
 * Custom hook for managing GSAP animations and timelines
 * 
 * @returns {Object} Animation state and functions
 */
export function useAnimationState() {
  const timelines = useRef(new Map())
  const tickerFunctions = useRef(new Map())
  const animationStates = useRef(new Map())
  
  /**
   * Create a new GSAP timeline
   * @param {string} id - Unique identifier for the timeline
   * @param {Object} options - GSAP timeline options
   * @returns {gsap.core.Timeline} The created timeline
   */
  const createTimeline = useCallback((id, options = {}) => {
    // Kill existing timeline if it exists
    if (timelines.current.has(id)) {
      const existingTimeline = timelines.current.get(id)
      existingTimeline.kill()
    }
    
    const timeline = gsap.timeline(options)
    timelines.current.set(id, timeline)
    return timeline
  }, [])
  
  /**
   * Get an existing timeline by ID
   * @param {string} id - Timeline identifier
   * @returns {gsap.core.Timeline|null} The timeline or null if not found
   */
  const getTimeline = useCallback((id) => {
    return timelines.current.get(id) || null
  }, [])
  
  /**
   * Add a ticker function for continuous animation
   * @param {string} id - Unique identifier for the ticker
   * @param {Function} fn - Function to execute on each tick
   */
  const addTicker = useCallback((id, fn) => {
    // Remove existing ticker if it exists
    if (tickerFunctions.current.has(id)) {
      gsap.ticker.remove(tickerFunctions.current.get(id))
    }
    
    tickerFunctions.current.set(id, fn)
    gsap.ticker.add(fn)
  }, [])
  
  /**
   * Remove a ticker function
   * @param {string} id - Ticker identifier
   */
  const removeTicker = useCallback((id) => {
    if (tickerFunctions.current.has(id)) {
      gsap.ticker.remove(tickerFunctions.current.get(id))
      tickerFunctions.current.delete(id)
    }
  }, [])
  
  /**
   * Set animation state for an element
   * @param {string} id - Unique identifier for the element
   * @param {Object} state - State object to store
   */
  const setAnimationState = useCallback((id, state) => {
    animationStates.current.set(id, state)
  }, [])
  
  /**
   * Get animation state for an element
   * @param {string} id - Element identifier
   * @returns {Object|null} The state object or null if not found
   */
  const getAnimationState = useCallback((id) => {
    return animationStates.current.get(id) || null
  }, [])
  
  /**
   * Update animation state for an element
   * @param {string} id - Element identifier
   * @param {Object} updates - Partial state updates
   */
  const updateAnimationState = useCallback((id, updates) => {
    const currentState = animationStates.current.get(id) || {}
    animationStates.current.set(id, { ...currentState, ...updates })
  }, [])
  
  // Cleanup all animations on unmount
  useEffect(() => {
    return () => {
      // Kill all timelines
      timelines.current.forEach(timeline => {
        timeline.kill()
      })
      
      // Remove all ticker functions
      tickerFunctions.current.forEach(fn => {
        gsap.ticker.remove(fn)
      })
      
      // Clear all maps
      timelines.current.clear()
      tickerFunctions.current.clear()
      animationStates.current.clear()
    }
  }, [])
  
  return {
    createTimeline,
    getTimeline,
    addTicker,
    removeTicker,
    setAnimationState,
    getAnimationState,
    updateAnimationState
  }
}
