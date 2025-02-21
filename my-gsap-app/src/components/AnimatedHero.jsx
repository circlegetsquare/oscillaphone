import { useGSAP } from '../hooks/useGSAP'
import { useRef } from 'react'
import gsap from 'gsap'

export default function AnimatedHero() {
  const heroRef = useRef(null)
  
  useGSAP(() => {
    gsap.from(heroRef.current, {
      y: 100,
      opacity: 0,
      duration: 1,
      ease: 'power4.out'
    })
  }, [])

  return (
    <div ref={heroRef} className="min-h-screen flex items-center justify-center">
      <h1 className="text-6xl font-bold">Welcome to GSAP + React</h1>
    </div>
  )
}
