import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'

type TickerFn = (time: number, deltaTime: number, frame: number) => void

/**
 * Manages GSAP timelines, per-ball tickers, and animation state maps,
 * with full cleanup on unmount.
 */
export function useAnimationState() {
  const timelines = useRef(new Map<string, gsap.core.Timeline>())
  const tickerFunctions = useRef(new Map<string, TickerFn>())
  const animationStates = useRef(new Map<string, Record<string, unknown>>())

  /** Create (or replace) a named GSAP timeline. */
  const createTimeline = useCallback((id: string, options: gsap.TimelineVars = {}): gsap.core.Timeline => {
    const existing = timelines.current.get(id)
    if (existing) existing.kill()
    const timeline = gsap.timeline(options)
    timelines.current.set(id, timeline)
    return timeline
  }, [])

  /** Retrieve a named timeline, or null if not found. */
  const getTimeline = useCallback((id: string): gsap.core.Timeline | null => {
    return timelines.current.get(id) ?? null
  }, [])

  /** Register a GSAP ticker callback under a unique id. Replaces any existing ticker for that id. */
  const addTicker = useCallback((id: string, fn: TickerFn): void => {
    const existing = tickerFunctions.current.get(id)
    if (existing) gsap.ticker.remove(existing)
    tickerFunctions.current.set(id, fn)
    gsap.ticker.add(fn)
  }, [])

  /** Remove the ticker registered under id (no-op if not found). */
  const removeTicker = useCallback((id: string): void => {
    const fn = tickerFunctions.current.get(id)
    if (fn) {
      gsap.ticker.remove(fn)
      tickerFunctions.current.delete(id)
    }
  }, [])

  /** Store arbitrary animation state for an id. */
  const setAnimationState = useCallback((id: string, state: Record<string, unknown>): void => {
    animationStates.current.set(id, state)
  }, [])

  /** Retrieve stored animation state, or null. */
  const getAnimationState = useCallback((id: string): Record<string, unknown> | null => {
    return animationStates.current.get(id) ?? null
  }, [])

  /** Merge partial updates into existing animation state. */
  const updateAnimationState = useCallback((id: string, updates: Record<string, unknown>): void => {
    const current = animationStates.current.get(id) ?? {}
    animationStates.current.set(id, { ...current, ...updates })
  }, [])

  // Kill all timelines and ticker callbacks on unmount
  useEffect(() => {
    const tl = timelines.current
    const tickers = tickerFunctions.current
    const states = animationStates.current
    return () => {
      tl.forEach(timeline => timeline.kill())
      tickers.forEach(fn => gsap.ticker.remove(fn))
      tl.clear()
      tickers.clear()
      states.clear()
    }
  }, [])

  return {
    createTimeline,
    getTimeline,
    addTicker,
    removeTicker,
    setAnimationState,
    getAnimationState,
    updateAnimationState,
  }
}
