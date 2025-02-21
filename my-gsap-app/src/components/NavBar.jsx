import { useRef } from 'react'
import { useGSAP } from '../hooks/useGSAP'
import gsap from 'gsap'

export default function NavBar() {
  const navRef = useRef(null)
  const linksRef = useRef([])

  useGSAP(() => {
    gsap.from(linksRef.current, {
      y: -20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out'
    })
  }, [])

  const handleHover = (index, isEntering) => {
    gsap.to(linksRef.current[index], {
      scale: isEntering ? 1.1 : 1,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  const navLinks = ['Home', 'About', 'Projects', 'Contact']

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold">GSAP Demo</span>
          </div>
          <div className="flex space-x-8">
            {navLinks.map((link, index) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                ref={el => linksRef.current[index] = el}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                onMouseEnter={() => handleHover(index, true)}
                onMouseLeave={() => handleHover(index, false)}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
