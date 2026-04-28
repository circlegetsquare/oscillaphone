# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Oscillaphone** is an interactive physics-based musical web application. Users click to create colorful bouncing balls that generate musical sounds on collision with walls and other balls. The app features extensive audio controls including musical scales, waveforms, and advanced audio effects.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173/oscillaphone/)
npm run build        # Production build → dist/
npm run lint         # ESLint (must be 0 errors before commit)
npm run preview      # Preview production build locally
npm test             # Run unit tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

**Workflow**: `npm run dev` for development, `npm run lint` before every commit, `npm test` to verify pure logic.

## Testing

**Stack**: Vitest (built into Vite, zero config, ESM-native). No jsdom needed — tests run in node environment.

**What's tested** (50 tests, 3 files):
- `src/utils/physics.test.js` — `checkCircleCollision`, `getCircleDistance`, `resolveCollision`
- `src/utils/spatialGrid.test.js` — `SpatialGrid` insert, query, clear, bounds clamping
- `src/context/audioReducer.test.js` — every action type, RESET_ALL_CONTROLS, unknown action passthrough

**What's not tested** (and why):
- `sound.js` / `effectChains.js` — Web Audio API doesn't exist in node; mocking it tests the mocks, not the logic
- GSAP tickers, rAF loops, `CircleCanvas` — too much DOM/layout dependency; covered by manual play-testing

**Adding tests**: `audioReducer`, `initialState`, and `ActionTypes` are exported from `AudioContext.jsx` specifically for testing. The test file mocks `../utils/sound` via `vi.mock` to prevent Web Audio API construction at import time.

## Architecture Overview

### Core Application Structure
- **Single Page Application**: React 19 + Vite 6
- **Main Entry**: `src/App.jsx` renders `BouncingCircles` directly
- **Physics Engine**: Custom collision detection in `src/utils/physics.js` + spatial hash grid in `src/utils/spatialGrid.js`
- **Audio Engine**: Web Audio API — no audio libraries
- **Animation Engine**: GSAP 3 ticker-based with custom React hooks

### Component Organization

```
src/
├── App.jsx
├── components/
│   ├── BouncingCircles/
│   │   ├── index.jsx              # Shell: layout, controls toggle, ball speed
│   │   ├── CircleCanvas.jsx       # Physics loop, rendering, collision events (~830 lines)
│   │   ├── ScaleSelector.jsx      # Musical scale picker
│   │   └── AudioControls/
│   │       ├── index.jsx          # Tab switcher (Wall / Ball Collision)
│   │       ├── WallControls.jsx   # Wall sound settings
│   │       ├── CircleControls.jsx # Ball collision sound settings
│   │       ├── EffectControls.jsx # Shared per-effect UI (delay/reverb/distortion/tremolo)
│   │       └── GlobalControls.jsx # Master volume + ball speed
│   └── shared/
│       ├── Button.jsx             # forwardRef button with GSAP hover
│       ├── Slider.jsx
│       ├── Checkbox.jsx
│       └── ControlPanel.jsx
├── context/
│   └── AudioContext.jsx           # useReducer-based global audio state (~918 lines)
├── hooks/
│   ├── useAnimationState.js       # GSAP timeline + ticker management
│   ├── useCollisions.js           # Circle physics state + collision detection
│   ├── useColorPalette.js         # Color generation + background gradient
│   └── useGSAP.js                 # Thin GSAP context wrapper
└── utils/
    ├── sound.js                   # Web Audio API: init, note selection, playback (~453 lines)
    ├── effectChains.js            # Pre-allocated pool of 8 EffectChain instances
    ├── audioPool.js               # Pre-allocated audio node pool
    ├── physics.js                 # Elastic collision detection + resolution
    └── spatialGrid.js             # Spatial hash grid for O(n) collision queries
```

### State Management
- **AudioContext Provider**: All audio parameters in React state via `useReducer`. Only two side-effect syncs remain (`setScale`, `setGlobalVolume`).
- **Settings refs in CircleCanvas**: `wallSettingsRef` and `circleSettingsRef` mirror React state into refs so long-lived ticker/rAF closures always read fresh values.
- **No external state libraries**: Pure React.

### Audio System

#### Signal Graph (per note)
```
Oscillator → Tremolo LFO → Distortion (dry/wet) → Reverb (dry/wet)
           → Delay (dry/wet) → StereoPanner
           → [EffectChain output] → GlobalCompressor → Limiter → MasterGain → Destination
```

#### Key Functions (`src/utils/sound.js`)
- `createOptimizedBeep(frequency, duration, volume, pan, soundSettings)` — takes React state object directly; no module-level per-setting variables
- `playCollisionBeep(pan, velocity, soundSettings)` — ball-to-ball collisions
- `playWallCollisionBeep(pan, velocity, soundSettings)` — wall bounces
- `setScale(scale)` and `setGlobalVolume(volume)` — the only module-level setters

#### Effect Chain Pool (`src/utils/effectChains.js`)
- 8 pre-allocated `EffectChain` instances (full signal graph wired at init)
- Checked out/returned per note to avoid allocation during playback
- Each chain: tremolo → distortion → reverb → delay → pan node

#### Dual Sound Settings
Wall collision sounds and ball-collision sounds have completely independent settings. Both are passed as plain React state objects — no duplication of module-level variables.

### Physics and Animation

#### Physics
- `src/utils/physics.js`: elastic circle-to-circle and circle-to-wall collision resolution
- `src/utils/spatialGrid.js`: spatial hash grid, O(n) broad-phase collision queries
- `CircleCanvas.jsx`: per-ball GSAP tickers run the physics loop; `requestAnimationFrame` handles collision event processing

#### Animation
- **GSAP ticker per ball**: position updates and squish animations
- **Background gradient**: continuous rotating gradient derived from ball colors via `useColorPalette`
- **Squish**: elastic GSAP scale deformation on every collision, proportional to velocity
- Always clean up tickers and timelines in `useEffect` cleanup; copy refs to local variables before use in cleanup functions

### Configuration

| File | Purpose |
|---|---|
| `vite.config.js` | `base: '/oscillaphone/'` for GitHub Pages |
| `eslint.config.js` | React-focused rules; must pass at 0 errors |
| `tailwind.config.js` | Utility CSS |

**Deployment**: GitHub Pages at `https://circlegetsquare.github.io/oscillaphone/`. Build output → `dist/`.

## Working with the Codebase

### Audio Guidelines
- AudioContext requires a user gesture to initialize (first click)
- Always clean up audio nodes after use; the EffectChain pool handles this
- Test across browsers — Web Audio API has cross-browser inconsistencies
- When adding a new effect: add to `effectChains.js`, wire in signal graph, add state + reducer action in `AudioContext.jsx`, add UI in `EffectControls.jsx`

### Physics Guidelines
- Collision detection changes go in `physics.js` and/or `spatialGrid.js`
- Physics loop lives in `CircleCanvas.jsx` GSAP ticker callbacks
- Test with many simultaneous circles at high speed
- Ensure circles don't overlap/stick after resolution

### React Patterns
- JSX transform is active — no `import React` needed; import only named exports (`useState`, `useRef`, etc.)
- `catch {}` (ES2019 optional binding) — no `catch (e)` with unused `e`
- `PropTypes` defined at the bottom of every component file
- `forwardRef` components set `displayName` explicitly
- `useEffect` cleanup functions: copy refs to local vars before use to satisfy `react-hooks/exhaustive-deps`

### Common Pitfalls
- **Stale closures**: Always read settings inside long-lived closures via `*Ref.current`, never capture state directly
- **Audio node reuse**: Oscillators cannot be restarted after `.stop()` — don't pool them
- **Ticker cleanup**: GSAP tickers added in `useEffect` must be removed in the cleanup return; use `addTicker`/`removeTicker` from `useAnimationState`

### Commit Conventions
Use conventional commits — enforced by practice, not tooling:
- `feat:` — new user-facing feature
- `fix:` — bug fix
- `chore:` — maintenance, deps, tooling, cleanup
- `docs:` — README, CLAUDE.md, comments only
- `refactor:` — code change with no behaviour change

### AudioContext Action Types
All actions follow the pattern `SET_{WALL|CIRCLE}_{PARAM}` or `SET_{WALL|CIRCLE}_{EFFECT}_{PARAM}`. Full list in `src/context/AudioContext.jsx` (`ActionTypes` object, line ~91). Summary:

```
SET_SCALE, SET_GLOBAL_VOLUME
SET_WALL_DURATION, SET_WALL_DETUNE, SET_WALL_WAVEFORM, SET_WALL_VOLUME
SET_WALL_DELAY_{ENABLED,TIME,FEEDBACK,MIX}
SET_WALL_REVERB_{ENABLED,ROOM_SIZE,DAMPING,MIX}
SET_WALL_DISTORTION_{ENABLED,AMOUNT,OVERSAMPLE,MIX}
SET_WALL_TREMOLO_{ENABLED,RATE,DEPTH,MIX}
SET_CIRCLE_*  — mirrors all SET_WALL_* above
RESET_ALL_CONTROLS
```

When adding a new effect, mirror both `WALL` and `CIRCLE` variants. Dispatch via `const { dispatch } = useAudio()`.

### CircleCanvas Props
```
CircleCanvas.propTypes = {
  onBackgroundChange: PropTypes.func,   // optional; called with gradient string
  initialSpeed: PropTypes.number        // optional; default defined internally
}
```

---

## Project Status

### Completed Refactors (as of April 2026)
All P1–P3 work is done. The codebase is clean: 0 ESLint errors, 0 warnings.

- **P1**: Fixed oversample setters, interval ID leak, import scoping, removed stubs
- **P2**: EffectChain pool fully wired; `createOptimizedBeep` is the sole playback path; dual-state collapse (`sound.js` 700→453 lines); oscillator pool pre-allocation removed
- **P3-A**: Deleted dead files (old `BouncingCircles.jsx` monolith, `AnimatedHero`, `NavBar`, `ScrollSection`, `MainLayout`, `animations.js`, `GlobalVolumeControl.jsx`, empty `contexts/`)
- **P3-B**: Pure HSL color conversion, `colorCache` size cap, `generateGradient` deduplication
- **P3-C**: PropTypes on every component, removed all `import React`, 225 lint errors → 0

### Pending Work (P4)
- **P4-20**: Ball count cap (prevent unbounded spawning)
- **P4-21**: Collapsible effect sections + overflow scroll on controls panel
- **P4-22 through P4-29**: Additional UX/feature items (details TBD)

---

## Hard-Won Bug History

### Bug: Collision loop dies after first collision
- **Symptom**: After the very first ball-wall or ball-ball collision, no further collisions are detected or sounds play.
- **Root cause**: `createOptimizedBeep`'s cleanup `setTimeout` referenced `settings.reverb.enabled` and `settings.delay.enabled` — stale names from a deleted predecessor function. This threw a `ReferenceError` which propagated up through `playCollisionBeep` → `collisionEvents.forEach` → `handleCollisions`, preventing `requestAnimationFrame(handleCollisions)` from re-queuing.
- **Fix**: Use the already-destructured locals `reverb.enabled` and `delay.enabled` instead.
- **Lesson**: A `ReferenceError` anywhere in the rAF callback chain silently kills the loop — always check that variable names match current scope after refactors.

### Bug: Audio controls (wall/circle settings) have no effect
- **Symptom**: Changing waveform, volume, effects etc. in the control panel has no audible effect.
- **Root cause**: `handlePointerDown` (via `useCallback`) and the rAF collision loop (via `useEffect`) both captured `wallSettings`/`circleSettings` at closure-creation time. The deps arrays didn't include those values, so closures always saw the initial defaults.
- **Fix**: Added `wallSettingsRef` and `circleSettingsRef` — refs that mirror state via a sync `useEffect`. All long-lived closures read `ref.current` instead of the captured state value.
- **Lesson**: Any state used inside a long-lived closure (`useCallback` without full deps, rAF loop, GSAP ticker) must be accessed via a ref, not captured directly.
