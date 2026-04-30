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

**Workflow**: `npm run dev` for development, `npm run lint` before every commit (note: currently 2 errors from a missing TS-ESLint plugin — see `.docs/BACKLOG.md` B4), `npm test` to verify pure logic.

## Testing

**Stack**: Vitest (built into Vite, zero config, ESM-native). No jsdom needed — tests run in node environment.

**What's tested** (50 tests, 3 files):
- `src/utils/physics.test.js` — `checkCircleCollision`, `getCircleDistance`, `resolveCollision`
- `src/utils/spatialGrid.test.js` — `SpatialGrid` insert, query, clear, bounds clamping
- `src/context/audioReducer.test.js` — every action type, RESET_ALL_CONTROLS, unknown action passthrough

**What's not tested** (and why):
- `sound.ts` — Web Audio API doesn't exist in node; mocking it tests the mocks, not the logic
- `effectChains.js` — same; though the IR-cache key, IR shape, and pool-overflow path are pure logic and should be covered (see `.docs/BACKLOG.md` A6)
- Hooks, GSAP tickers, rAF loops, `CircleCanvas` — too much DOM/layout dependency; covered by manual play-testing

**Adding tests**: `audioReducer`, `initialState`, and `ActionTypes` are exported from `AudioContext.tsx` specifically for testing. The test file mocks `../utils/sound` via `vi.mock` to prevent Web Audio API construction at import time.

## Architecture Overview

### Core Application Structure
- **Single Page Application**: React 19 + Vite 6
- **Main Entry**: `src/App.jsx` renders `BouncingCircles` directly
- **Physics Engine**: Custom collision detection in `src/utils/physics.js` + spatial hash grid in `src/utils/spatialGrid.js`
- **Audio Engine**: Web Audio API — no audio libraries
- **Animation Engine**: GSAP 3 ticker-based with custom React hooks
- **Type system**: Ongoing TypeScript migration (`strict: true`, `checkJs: true`). Wave 1 complete: audio core, all pure utils, all hooks, all `shared/` components, `main.tsx`, `App.tsx`, `ScaleSelector.tsx`. Remaining `.jsx` files have `// @ts-nocheck` as escape hatches. Wave 2 (audioPool, effectChains, AudioControls, CircleCanvas) deferred — see `.docs/BACKLOG.md` A3.

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
│   ├── AudioContext.tsx           # useReducer audio state + localStorage persistence (~990 lines)
│   └── audioReducer.test.js       # Reducer unit tests
├── types/
│   └── audio.ts                   # SoundSettings, AudioState, AudioAction discriminated union
├── hooks/
│   ├── useAnimationState.js       # GSAP timeline + ticker management
│   ├── useCollisions.js           # Circle physics state + collision detection
│   ├── useColorPalette.js         # Color generation + background gradient
│   └── useGSAP.js                 # Thin GSAP context wrapper
└── utils/
    ├── sound.ts                   # Web Audio init, scales, createOptimizedBeep (~620 lines)
    ├── effectChains.js            # Pre-allocated pool of 8 EffectChain instances; ConvolverNode reverb + IR cache
    ├── audioPool.js               # Pre-allocated audio node pool
    ├── physics.js                 # Elastic collision detection + resolution
    └── spatialGrid.js             # Spatial hash grid for O(n) collision queries
```

### State Management
- **AudioContext Provider**: All audio parameters in React state via `useReducer`. Only two side-effect syncs remain (`setScale`, `setGlobalVolume`).
- **Persistence**: State is loaded from `localStorage` (deep-merged with `initialState` so new keys appear in old saves) and re-written on every dispatch. ⚠️ Currently un-debounced — fires on every slider tick (see `.docs/BACKLOG.md` A2).
- **Settings refs in CircleCanvas**: `wallSettingsRef` and `circleSettingsRef` mirror React state into refs so long-lived ticker/rAF closures always read fresh values.
- **No external state libraries**: Pure React.

### Audio System

#### Signal Graph (per note)
```
Oscillator → Tremolo LFO → Distortion (dry/wet) → Reverb (ConvolverNode, dry/wet)
           → Delay (dry/wet) → StereoPanner
           → [EffectChain output] → GlobalCompressor → Limiter → MasterGain → Destination
```

#### Key Functions (`src/utils/sound.ts`)
- `createOptimizedBeep(frequency, duration, volume, pan, soundSettings)` — takes React state object directly; no module-level per-setting variables
- `playCollisionBeep(pan, velocity, soundSettings)` — ball-to-ball collisions
- `playWallCollisionBeep(pan, velocity, soundSettings)` — wall bounces
- `setScale(scale)` and `setGlobalVolume(volume)` — the only module-level setters
- ⚠️ `cleanupNodes`, `cleanup`, `getGlobalVolume`, `playBeep`, `_tombstone` are exported but unused — see `.docs/BACKLOG.md` A4

#### Effect Chain Pool (`src/utils/effectChains.js`)
- 8 pre-allocated `EffectChain` instances (full signal graph wired at init)
- Checked out/returned per note to avoid allocation during playback
- Each chain: tremolo LFO → distortion → reverb (ConvolverNode + per-(roomSize,damping) IR cache) → delay → pan node
- ⚠️ `distortion.oversample` is never applied to the WaveShaperNode — see `.docs/BACKLOG.md` B1

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
- AudioContext requires a user gesture to initialize (first click); also: it must be explicitly `.resume()`-d on iOS Safari (currently NOT done — see `.docs/BACKLOG.md` B3)
- Always clean up audio nodes after use; the EffectChain pool handles this
- Test across browsers — Web Audio API has cross-browser inconsistencies
- When adding a new effect: add to `effectChains.js` (wire in `wireChain`, configure in `configure()`); add `SoundSettings` field in `src/types/audio.ts`; add `WALL`/`CIRCLE` action types + reducer cases in `AudioContext.tsx`; expose action creators; wire UI in `EffectControls.jsx`

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
The reducer uses a path-based design (A13). Only two action types exist:

```ts
{ type: 'SET'; path: string[]; value: unknown }
{ type: 'RESET_ALL_CONTROLS' }
```

All named setters on the context value are thin wrappers: `setWallDelayMix: (v) => set(['wallSettings', 'delay', 'mix'], v)`. Dispatch via `const { dispatch } = useAudio()`, or use the named setters from `useAudio()`.

### CircleCanvas Props
```tsx
interface CircleCanvasProps {
  onBackgroundChange?: (colors: string[]) => void  // optional; called with gradient string
  initialSpeed?: number                             // optional; default 15
}
```

---

## Project Status

Full, ranked backlog lives in [.docs/BACKLOG.md](../.docs/BACKLOG.md). Snapshot review of architecture and gaps in [.docs/REVIEW.md](../.docs/REVIEW.md) (third pass, April 2026).

### Current baseline
`tsc --noEmit` passes · `npm run lint` 0 errors / 3 warnings (known, intentional) · `npm test` 62/62 · production build 306 kB JS.

### Completed Refactors (all P1–P5 and A1–A14)

- **P1–P3**: Oversample/timer/import fixes; dead-file cleanup; PropTypes; HSL conversion; 50 Vitest tests
- **P4**: 3 new scales; ConvolverNode reverb; `localStorage` persistence; accessibility; touch support; ball cap (50, FIFO); `removeBall` (ticker + animation cleanup)
- **P5 bugs (all done)**: B1 distortion oversample applied; B2 `cleanupAudio()` on unmount; B3 `resumeAudioContext()` on gesture; B4 lint fixed (0 errors)
- **A1**: CI quality gate (`lint && test && tsc`) before deploy
- **A2**: `localStorage` debounced 250 ms
- **A3**: Full TypeScript migration — Wave 1 (types, utils, hooks, shared components) + Wave 2 (audioPool, effectChains, all AudioControls, BouncingCircles/index, CircleCanvas); all `.jsx`/`.js` deleted; `react/prop-types` off for `.ts/.tsx`
- **A4**: Dead exports removed from `sound.ts`
- **A5**: ESLint `react.version: 'detect'`
- **A6**: 12 `effectChains.ts` tests (IR cache, IR shape, pool overflow)
- **A7**: `.DS_Store` in `.gitignore`
- **A8+B4**: `no-non-null-assertion` disable comments removed
- **A11**: `lastCollisionTimes` Map pruned in `removeBall`
- **A12**: Dead `audioPool` cleanup timer removed
- **A13**: `AudioContext.tsx` collapsed — path-based `setIn` reducer, ~1020 → ~270 lines, `AudioAction` union = 2 variants
- **A14**: `tsconfig.json` `checkJs: true`

### Open backlog (P4 UX features)
See `.docs/BACKLOG.md` for full descriptions.

- **P4-2**: Collapsible effect sections + overflow scroll
- **P4-3**: Tremolo waveform shape UI (backend already accepts `tremolo.shape`)
- **P4-4**: Audio settings preset system
- **P4-5**: Custom favicon and OG meta tags

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
