# Technology Stack and Architecture Decisions

## Core Technologies

### React
- Version: 18.2.0
- Chosen for its robust component model and efficient rendering
- Leveraging hooks for animation management
- Using functional components with modern React patterns

### GSAP (GreenSock Animation Platform)
- Version: 3.12.5
- Selected for:
  - Professional-grade animation capabilities
  - Cross-browser consistency
  - Performance optimization
  - Rich feature set including ScrollTrigger
- Implementation through custom hooks for React integration

### Web Audio API
- Browser-native audio processing capabilities
- Used for dynamic sound generation and manipulation
- Features implemented:
  - Oscillator-based sound synthesis
  - Stereo panning based on spatial position
  - Multiple musical scales (C Major, A Minor, F Lydian)
  - Audio effects processing chain:
    - Delay with feedback
    - Custom reverb simulation
    - Distortion with waveshaping
    - Tremolo with LFO modulation
  - Volume optimization for multiple simultaneous sounds
  - Proper resource management and cleanup

### Build Tools
- Vite (v5.0.8)
  - Fast development server
  - Efficient build process
  - Modern ESM-based architecture

## Styling
### Tailwind CSS
- Version: 3.4.1
- Utility-first CSS framework
- Enables rapid UI development
- Excellent responsive design capabilities
- PostCSS and Autoprefixer integration

## Project Architecture

### Component Structure
- Modular component design
- Separation of concerns:
  - Layout components
  - Animation components
  - Utility functions
  - Custom hooks

### Animation Architecture
- Custom GSAP hook (useGSAP)
  - Handles GSAP context
  - Proper cleanup on unmount
  - Dependency array for controlled updates
- Centralized animation utilities
- ScrollTrigger integration for scroll-based animations

### Audio Architecture
- Centralized audio context management
- Modular audio processing chain
- Separate control systems for different sound types:
  - Wall collision sounds
  - Circle collision sounds
- Context API for global audio state management
- Cooldown mechanisms to prevent audio overload
- Resource cleanup to prevent memory leaks

### File Organization
- Structured by feature and type
- Clear separation of concerns
- Scalable folder structure
- Reusable animation patterns

## Development Tools
- ESLint for code quality
- PostCSS for CSS processing
- TypeScript-ready configuration
