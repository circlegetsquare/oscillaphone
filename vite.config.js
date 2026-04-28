import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/oscillaphone/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/physics.js', 'src/utils/spatialGrid.js', 'src/context/AudioContext.jsx'],
    },
  },
})
