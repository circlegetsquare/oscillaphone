import { useState, useCallback, type Dispatch, type SetStateAction } from 'react'

function generateInitialColors(count: number): string[] {
  return Array.from({ length: count }, () => {
    const hue = Math.random() * 360
    return `hsl(${hue}, 70%, 50%)`
  })
}

/**
 * Manages a rolling color palette used for the background gradient and ball colours.
 */
export function useColorPalette(initialCount = 3, maxColors = 10) {
  const [colorPalette, setColorPalette] = useState<string[]>(() => generateInitialColors(initialCount))
  const [backgroundColors, setBackgroundColors] = useState<string[]>(() => generateInitialColors(initialCount))

  const generateRandomColor = useCallback((): string => {
    const hue = Math.random() * 360
    return `hsl(${hue}, 70%, 50%)`
  }, [])

  const addToColorPalette = useCallback((color: string): void => {
    setColorPalette(prev => [...prev, color].slice(-maxColors))
  }, [maxColors])

  /**
   * Build a layered CSS gradient string from an array of HSL colours and
   * a 0-1 progress value (used to continuously rotate the gradient).
   */
  const generateGradient = useCallback((colors: string[], progress: number): string => {
    const gradientColors = colors.map(color => {
      const match = color.match(/\d+/g) ?? ['0', '70', '50']
      const [h, s, l] = match
      return `hsla(${h}, ${s}%, ${l}%, 0.7)`
    })

    const angles = gradientColors.map((_, i) => {
      const baseAngle = (360 / colors.length) * i
      return ((baseAngle + progress * 360) % 360).toFixed(2)
    })

    return gradientColors
      .map((color, i) => `linear-gradient(${angles[i]}deg, ${color} 0%, rgba(0,0,0,0) 70.71%)`)
      .join(', ')
  }, [])

  const updateBackgroundColors = useCallback((count = 3): void => {
    if (colorPalette.length >= count) {
      setBackgroundColors([...colorPalette.slice(-count)])
    }
  }, [colorPalette])

  const addRandomColor = useCallback((): string => {
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
    setBackgroundColors: setBackgroundColors as Dispatch<SetStateAction<string[]>>,
  }
}
