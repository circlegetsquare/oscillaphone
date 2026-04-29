import { useState, useCallback, useEffect, useRef } from 'react'
import { AudioProvider } from '../../context/AudioContext'
import ScaleSelector from './ScaleSelector'
import AudioControls from './AudioControls'
import CircleCanvas from './CircleCanvas'
import Button from '../shared/Button'
import gsap from 'gsap'
import { useColorPalette } from '../../hooks/useColorPalette'

export default function BouncingCircles() {
  const [showControls, setShowControls] = useState(false)
  const [ballSpeed, setBallSpeed] = useState(15)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const buttonTimeline = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null)
  const controlsRef = useRef<HTMLDivElement | null>(null)
  const controlsTimeline = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null)

  const { generateGradient } = useColorPalette()

  // Animate controls menu in/out
  const toggleControls = useCallback(() => {
    const next = !showControls

    if (next) {
      setShowControls(true)
      requestAnimationFrame(() => {
        if (controlsRef.current) {
          if (controlsTimeline.current) controlsTimeline.current.kill()
          gsap.set(controlsRef.current, { opacity: 0, rotation: -360, scale: 0.1 })
          controlsTimeline.current = gsap.to(controlsRef.current, {
            opacity: 1, rotation: 0, scale: 1,
            duration: 1.25, ease: 'elastic.inOut(1, 0.4)',
          })
        }
      })
    } else {
      if (controlsRef.current) {
        if (controlsTimeline.current) controlsTimeline.current.kill()
        controlsTimeline.current = gsap.to(controlsRef.current, {
          opacity: 0, duration: 0.7, ease: 'power2.in',
          onComplete: () => setShowControls(false),
        })
      } else {
        setShowControls(false)
      }
    }
  }, [showControls])

  // Cleanup timelines on unmount
  useEffect(() => {
    const bt = buttonTimeline
    const ct = controlsTimeline
    return () => {
      if (bt.current) { bt.current.kill(); bt.current = null }
      if (ct.current) { ct.current.kill(); ct.current = null }
    }
  }, [])

  const generateRandomColor = useCallback((): string => {
    const hue = Math.random() * 360
    return `hsl(${hue}, 70%, 50%)`
  }, [])

  const generateRandomColors = useCallback((count = 3): string[] => {
    return Array.from({ length: count }, () => generateRandomColor())
  }, [generateRandomColor])

  const handleButtonMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const colors = generateRandomColors(3)
    if (buttonTimeline.current) buttonTimeline.current.kill()

    const timeline = gsap.timeline({
      repeat: -1,
      onUpdate: () => {
        button.style.background = generateGradient(colors, timeline.progress())
      },
    })
    timeline.to({}, { duration: 4, ease: 'none' })
    buttonTimeline.current = timeline

    gsap.to(button, { color: 'white', duration: 0.3 })
  }, [generateRandomColors, generateGradient])

  const handleButtonMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    if (buttonTimeline.current) { buttonTimeline.current.kill(); buttonTimeline.current = null }
    gsap.to(button, { background: 'transparent', color: '#6b21a8', duration: 0.3 })
  }, [])

  return (
    <AudioProvider>
      <div style={{
        position: 'absolute', top: '16px', right: '16px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        zIndex: 10000,
      }}>
        <ScaleSelector />

        <div style={{ marginBottom: '6px' }}>
          <Button
            ref={buttonRef}
            onClick={toggleControls}
            style={{
              backgroundColor: 'transparent', color: '#6b21a8',
              border: '2px solid #6b21a8', width: '100%',
              padding: '10px 16px', display: 'flex',
              justifyContent: 'center', alignItems: 'center', gap: '8px',
              position: 'relative', overflow: 'hidden', transition: 'color 0.3s ease',
            }}
            onMouseEnter={handleButtonMouseEnter}
            onMouseLeave={handleButtonMouseLeave}
          >
            <div style={{ minWidth: '110px', textAlign: 'center' }}>
              {showControls ? 'Vibe out' : 'Get weird'}
            </div>
          </Button>
        </div>

        {showControls && (
          <div ref={controlsRef}>
            <AudioControls visible={true} speed={ballSpeed} setSpeed={setBallSpeed} />
          </div>
        )}
      </div>

      <CircleCanvas onBackgroundChange={() => {}} initialSpeed={ballSpeed} />
    </AudioProvider>
  )
}
