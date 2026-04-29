import { useState, forwardRef, type ButtonHTMLAttributes, type ReactNode, type CSSProperties } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  backgroundColor?: string
  hoverColor?: string
  activeColor?: string
  isActive?: boolean
  children?: ReactNode
  style?: CSSProperties
}

const defaultStyles: CSSProperties = {
  padding: '8px 16px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  color: 'white',
  transition: 'background-color 0.2s',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '14px',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  backgroundColor = '#6b21a8',
  hoverColor = '#7e22ce',
  activeColor = '#9333ea',
  isActive = false,
  onClick,
  children,
  style = {},
  ...props
}, ref) => {
  const [isHovered, setIsHovered] = useState(false)

  const getBackgroundColor = (): string => {
    if (isActive) return activeColor
    if (isHovered) return hoverColor
    return backgroundColor
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{ ...defaultStyles, backgroundColor: getBackgroundColor(), ...style }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
