import { useEffect, useRef, type DependencyList, type MutableRefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const useGSAP = (
  callback: () => void,
  deps: DependencyList = [],
): MutableRefObject<gsap.Context> => {
  const ctx = useRef<gsap.Context>(gsap.context(() => {}))

  useEffect(() => {
    ctx.current = gsap.context(callback)
    return () => ctx.current.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ctx
}
