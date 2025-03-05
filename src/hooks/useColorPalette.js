import { useState, useCallback } from 'react'

/**
 * Custom hook for managing color palettes
 * 
 * @param {number} initialCount - Initial number of colors to generate
 * @param {number} maxColors - Maximum number of colors to keep in history
 * @returns {Object} Color palette state and functions
 */
export function useColorPalette(initialCount = 3, maxColors = 10) {
  const [colorPalette, setColorPalette] = useState(() => generateInitialColors(initialCount))
  const [backgroundColors, setBackgroundColors] = useState(() => [...colorPalette])
  
  /**
   * Generate a random HSL color
   * @returns {string} HSL color string
   */
  const generateRandomColor = useCallback(() => {
    const hue = Math.random() * 360
    return `hsl(${hue}, 70%, 50%)`
  }, [])
  
  /**
   * Generate an array of random colors
   * @param {number} count - Number of colors to generate
   * @returns {string[]} Array of HSL color strings
   */
  function generateInitialColors(count) {
    return Array(count).fill().map(() => {
      const hue = Math.random() * 360
      return `hsl(${hue}, 70%, 50%)`
    })
  }
  
  /**
   * Add a color to the palette
   * @param {string} color - HSL color string to add
   */
  const addToColorPalette = useCallback((color) => {
    setColorPalette(prev => {
      const newPalette = [...prev, color]
      return newPalette.slice(-maxColors) // Keep last maxColors colors
    })
  }, [maxColors])
  
  /**
   * Generate a CSS gradient string from colors and progress
   * @param {string[]} colors - Array of HSL color strings
   * @param {number} progress - Animation progress (0-1)
   * @returns {string} CSS gradient string
   */
  const generateGradient = useCallback((colors, progress) => {
    // Convert HSL colors to HSLA with opacity
    const gradientColors = colors.map(color => {
      const [h, s, l] = color.match(/\d+/g)
      return `hsla(${h}, ${s}%, ${l}%, 0.7)` // Reduced opacity for better blending
    })

    // Calculate continuous rotation angles with offset
    const angles = gradientColors.map((_, i) => {
      const baseAngle = (360 / colors.length) * i // Evenly space base angles
      const rotationAngle = ((baseAngle + progress * 360) % 360).toFixed(2) // Full rotation based on progress
      return rotationAngle
    })
    
    // Build gradient string
    return gradientColors.map((color, i) => 
      `linear-gradient(${angles[i]}deg, ${color} 0%, rgba(0,0,0,0) 70.71%)`
    ).join(', ')
  }, [])
  
  /**
   * Update background colors from palette
   * @param {number} count - Number of colors to use (default: 3)
   */
  const updateBackgroundColors = useCallback((count = 3) => {
    if (colorPalette.length >= count) {
      setBackgroundColors([...colorPalette.slice(-count)])
    }
  }, [colorPalette])
  
  /**
   * Generate a new random color and add it to the palette
   * @returns {string} The newly generated color
   */
  const addRandomColor = useCallback(() => {
    const color = generateRandomColor()
    addToColorPalette(color)
    return color
  }, [generateRandomColor, addToColorPalette])
  
  return {
    colorPalette,
    backgroundColors,
    generateRandomColor,
    addToColorPalette,
    generateGradient,
    updateBackgroundColors,
    addRandomColor,
    setBackgroundColors
  }
}
