# Oscillaphone

Let's vibe out.

An interactive physics-based musical experience. Click anywhere to create colorful bouncing balls that generate sounds on every collision — with walls and with each other.

**[Deployed live](https://circlegetsquare.github.io/oscillaphone/)**

---

## Features

- **Physics engine** — elastic circle-to-circle and circle-to-wall collisions with realistic bounce and energy loss
- **Spatial grid** — O(n) collision detection via spatial partitioning
- **Web Audio API** — full oscillator → effects chain → compressor → limiter → master volume signal graph
- **Per-collision-type controls** — wall sounds and ball-collision sounds are configured independently
- **Four audio effects** — delay, reverb, distortion, and tremolo, each with enable/disable and wet/dry mix
- **Musical scales** — C Major, A Minor, F Lydian, and more; pitches are drawn from the active scale
- **Four waveforms** — sine, square, sawtooth, triangle
- **Squish animations** — GSAP-powered elastic deformation on every collision, proportional to velocity
- **Dynamic background** — continuously rotating gradient derived from ball colors
- **Touch / stylus support** — pointer events, works on mobile

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173/oscillaphone/
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## How to Play

1. **Click (or tap)** anywhere on the canvas to spawn a ball
2. Balls bounce off walls and each other, playing a note on each collision
3. Open the **control panel** (button, top-right) to tune the sound:
   - **Key** — change the musical scale
   - **Master Volume / Ball Speed** — global controls
   - **Ball Collision Sound** — waveform, volume, duration, detune, and effects for ball-to-ball hits
   - **Wall Sound** — same controls for wall bounces
   - Each effect section (Tremolo, Distortion, Reverb, Delay) can be toggled independently
4. Hit **Reset controls** to return everything to defaults

---

## Architecture

```
src/
├── App.jsx                         Entry point → BouncingCircles
├── components/
│   ├── BouncingCircles/
│   │   ├── index.jsx               Shell: layout, controls toggle, speed
│   │   ├── CircleCanvas.jsx        Physics loop, rendering, collision events
│   │   ├── ScaleSelector.jsx       Musical scale picker
│   │   └── AudioControls/          Per-type sound controls (wall + circle)
│   └── shared/                     Button, Slider, Checkbox, ControlPanel
├── context/
│   └── AudioContext.jsx            useReducer-based global audio state
├── hooks/
│   ├── useAnimationState.js        GSAP timeline + ticker management
│   ├── useCollisions.js            Circle physics state + collision detection
│   ├── useColorPalette.js          Color generation + background gradient
│   └── useGSAP.js                  Thin GSAP context wrapper
└── utils/
    ├── sound.js                    Web Audio API: init, note selection, playback
    ├── effectChains.js             Pre-allocated EffectChain pool (8 chains)
    ├── audioPool.js                Pre-allocated audio node pool
    ├── physics.js                  Collision detection + elastic resolution
    └── spatialGrid.js              Spatial hash grid for O(n) collision queries
```

**Audio signal graph** (per note):
```
Oscillator → Tremolo LFO → Distortion (dry/wet) → Reverb (dry/wet)
           → Tremolo mix → Delay (dry/wet) → StereoPanner
           → [EffectChain output] → GlobalCompressor → Limiter → MasterGain → Destination
```

**State management**: All audio parameters live in React state (`AudioContext`). `CircleCanvas` reads `wallSettings` / `circleSettings` via refs and passes them directly to `playWallCollisionBeep` / `playCollisionBeep` — no module-level variable duplication.

---

## Built With

- [React 19](https://react.dev)
- [GSAP 3](https://gsap.com) — animations and physics ticker
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Vite 6](https://vite.dev)
- [Tailwind CSS 4](https://tailwindcss.com)

---

## License

MIT
