import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const useGSAP = (callback, deps = []) => {
  const ctx = useRef(gsap.context(() => {}))

  useEffect(() => {
    ctx.current = gsap.context(callback)

    return () => ctx.current.revert()
  }, deps)

  return ctx
}
