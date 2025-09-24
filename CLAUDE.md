# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Oscillaphone** is an interactive physics-based musical web application. Users click to create colorful bouncing balls that generate musical sounds on collision with walls and other balls. The app features extensive audio controls including musical scales, waveforms, and advanced audio effects.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Development Workflow
- Use `npm run dev` for active development
- Run `npm run lint` before commits to ensure code quality
- Use `npm run build` to test production builds

## Architecture Overview

### Core Application Structure
- **Single Page Application**: React-based with Vite build system
- **Main Entry**: `src/App.jsx` renders `BouncingCircles` component directly
- **Physics Engine**: Custom collision detection and resolution system
- **Audio Engine**: Web Audio API with advanced effects processing
- **Animation Engine**: GSAP-based with custom React hooks

### Key Architectural Patterns

#### Component Organization
```
src/
├── components/
│   ├── BouncingCircles/           # Main interactive component
│   │   ├── index.jsx              # Main container component
│   │   ├── CircleCanvas.jsx       # Canvas and physics rendering
│   │   ├── ScaleSelector.jsx      # Musical scale selection
│   │   └── AudioControls/         # Sound parameter controls
│   └── shared/                    # Reusable UI components
├── context/
│   └── AudioContext.jsx           # Global audio state management
├── utils/
│   ├── sound.js                   # Web Audio API integration
│   ├── physics.js                 # Collision detection/resolution
│   └── animations.js              # GSAP animation utilities
└── hooks/                         # Custom React hooks
```

#### State Management Architecture
- **AudioContext Provider**: Centralized audio parameter state using React Context + useReducer
- **Local Component State**: Physics state, UI state, animation references managed locally
- **No External State Libraries**: Pure React state management patterns

### Audio System Architecture

The audio system is the most complex part of the application:

#### Sound Processing Chain
1. **Oscillators**: Generate base tones using different waveforms (sine, square, sawtooth, triangle)
2. **Effects Chain**: Delay → Reverb → Distortion → Tremolo
3. **Global Processing**: Compressor → Limiter → Master Volume
4. **Stereo Positioning**: Pan based on horizontal collision position

#### Dual Audio Contexts
- **Wall Collision Sounds**: Triggered when balls hit screen edges
- **Circle Collision Sounds**: Triggered when balls collide with each other
- Each context has independent settings for all parameters

#### Audio Parameters
- Musical scales (C Major, A Minor, F Lydian, etc.)
- Waveform selection per collision type
- Volume, duration, and detune controls
- Advanced effects: delay, reverb, distortion, tremolo

### Physics and Animation System

#### Physics Implementation
- **Custom Physics Engine**: Located in `src/utils/physics.js`
- **Collision Detection**: Circle-to-circle and circle-to-wall
- **Elastic Collisions**: Realistic bounce physics with energy loss
- **Position Resolution**: Prevents circle overlap/sticking

#### Animation Approach
- **GSAP Integration**: Professional animation library for smooth performance
- **Ticker-based Animation**: Continuous physics updates using GSAP ticker system
- **Squish Animations**: Visual feedback on collisions with elastic deformation
- **Background Gradients**: Dynamic color-based backgrounds that rotate continuously

## Working with the Codebase

### Important Development Notes

#### Audio System Guidelines
- Audio context initialization requires user gesture (click to start)
- Always clean up audio nodes to prevent memory leaks
- Use the centralized AudioContext provider for state management
- Test audio across different browsers (Web Audio API inconsistencies)

#### Animation Best Practices
- Use GSAP's ticker system for physics-based animations
- Clean up timelines and tickers in useEffect cleanup
- Store animation references in useRef to prevent recreation
- Use requestAnimationFrame for DOM-based position updates

#### Performance Considerations
- **Circle Limits**: Large numbers of circles can impact performance
- **Audio Node Management**: Properly dispose of audio nodes after use
- **Animation Optimization**: Use GSAP's will-change and transform properties
- **Memory Management**: Clean up event listeners and animation references

### Code Patterns

#### Custom Hooks Pattern
The app uses several custom hooks for complex state management:
- **useGSAP**: Manages GSAP context and cleanup
- **useAnimationState**: Handles animation timelines and state
- **useCollisions**: Manages collision detection and physics
- **useColorPalette**: Generates and manages color schemes

#### Audio Effect Implementation
Audio effects follow a consistent pattern in `src/utils/sound.js`:
1. Create effect node during audio context initialization
2. Connect to appropriate point in audio chain
3. Provide getter/setter functions for parameters
4. Handle enabled/disabled state properly

#### Physics Integration
Physics updates happen in GSAP ticker functions:
1. Update positions based on velocity
2. Check for collisions (wall and circle-to-circle)
3. Resolve collisions and apply new velocities
4. Update visual positions via GSAP

### Configuration Files

#### Build Configuration
- **Vite Config**: `vite.config.js` - configured for GitHub Pages deployment (`base: '/oscillaphone/'`)
- **ESLint**: `eslint.config.js` - React-focused linting rules
- **Tailwind**: `tailwind.config.js` - CSS utility configuration

#### Package Dependencies
- **React 19.0.0**: Modern React with latest features
- **GSAP 3.12.7**: Professional animation library
- **Vite 6.1.0**: Fast build tool and dev server
- **Tailwind CSS 4.0.8**: Utility-first CSS framework

### Testing and Deployment

#### Local Development
- Run `npm run dev` and test in multiple browsers
- Test audio functionality (requires user interaction)
- Verify physics behavior with multiple circles
- Check performance with many active animations

#### Production Deployment
- Currently configured for GitHub Pages
- Build artifacts go to `dist/` directory
- Base URL configured as `/oscillaphone/` for GitHub Pages

### Common Development Tasks

#### Adding New Audio Effects
1. Add effect creation in `initAudioContext()` in `src/utils/sound.js`
2. Add parameter getter/setter functions
3. Update `AudioContext.jsx` with new state and actions
4. Add UI controls in appropriate `AudioControls` component

#### Modifying Physics Behavior
1. Update collision detection in `src/utils/physics.js`
2. Modify velocity/position calculations in ticker functions
3. Test with various circle sizes and speeds
4. Ensure proper separation of overlapping circles

#### Adding Visual Effects
1. Create new GSAP animations in component or utility
2. Use refs to store animation references
3. Ensure proper cleanup in useEffect
4. Consider performance impact of complex animations

This architecture supports rapid development while maintaining clear separation of concerns between physics, audio, and visual systems.