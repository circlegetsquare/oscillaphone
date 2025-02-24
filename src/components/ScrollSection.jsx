import { useRef } from 'react'
import { useGSAP } from '../hooks/useGSAP'
import gsap from 'gsap'

export default function ScrollSection() {
  const sectionRef = useRef(null)
  const cardsRef = useRef([])

  useGSAP(() => {
    cardsRef.current.forEach((card, index) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top bottom-=100',
          end: 'top center',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        delay: index * 0.2,
        ease: 'power3.out'
      })
    })
  }, [])

  const cards = [
    {
      title: 'Smooth Animations',
      description: 'Create fluid, professional animations with GSAP'
    },
    {
      title: 'ScrollTrigger',
      description: 'Trigger animations based on scroll position'
    },
    {
      title: 'React Integration',
      description: 'Seamlessly integrate GSAP with React components'
    }
  ]

  return (
    <section ref={sectionRef} className="py-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <div
              key={card.title}
              ref={el => cardsRef.current[index] = el}
              className="bg-white p-6 rounded-lg shadow-lg"
            >
              <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
              <p className="text-gray-600">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
