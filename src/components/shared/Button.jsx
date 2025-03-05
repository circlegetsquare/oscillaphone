import React, { useState, forwardRef } from 'react'

const defaultStyles = {
  padding: '8px 16px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  color: 'white',
  transition: 'background-color 0.2s',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '14px'
}

/**
 * Reusable Button component with hover effects
 * 
 * @param {Object} props - Component props
 * @param {string} props.backgroundColor - Default background color
 * @param {string} props.hoverColor - Background color on hover
 * @param {string} props.activeColor - Background color when active/selected
 * @param {boolean} props.isActive - Whether the button is in active/selected state
 * @param {Function} props.onClick - Click handler function
 * @param {React.ReactNode} props.children - Button content
 * @param {Object} props.style - Additional inline styles
 * @param {React.Ref} ref - Forwarded ref
 */
const Button = forwardRef(({ 
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
  
  const getBackgroundColor = () => {
    if (isActive) return activeColor
    if (isHovered) return hoverColor
    return backgroundColor
  }
  
  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        ...defaultStyles,
        backgroundColor: getBackgroundColor(),
        ...style
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
})

// Add display name for debugging
Button.displayName = 'Button'

export default Button
