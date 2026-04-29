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
All actions follow the pattern `SET_{WALL|CIRCLE}_{PARAM}` or `SET_{WALL|CIRCLE}_{EFFECT}_{PARAM}`. Full list in `src/context/AudioContext.tsx` (`ActionTypes` object, line ~91); typed in `src/types/audio.ts` as a discriminated `AudioAction` union. Summary:

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

Full, ranked backlog lives in [.docs/BACKLOG.md](../.docs/BACKLOG.md). Snapshot review of architecture and gaps in [.docs/REVIEW.md](../.docs/REVIEW.md) (third pass, April 2026).

### Completed Refactors (P1 through partial P4)
`tsc --noEmit` passes; tests are 50/50; `npm run lint` currently reports 2 errors / 4 warnings (see backlog **B4** — a TS-ESLint plugin is referenced by disable comments but never registered).

- **P1**: Fixed oversample setters, interval ID leak, import scoping, removed stubs
- **P2**: EffectChain pool fully wired; `createOptimizedBeep` is the sole playback path; dual-state collapse (`sound.js` 700→453 lines); oscillator pool pre-allocation removed
- **P3-A**: Deleted dead files (old `BouncingCircles.jsx` monolith, `AnimatedHero`, `NavBar`, `ScrollSection`, `MainLayout`, `animations.js`, `GlobalVolumeControl.jsx`, empty `contexts/`)
- **P3-B**: Pure HSL color conversion, `colorCache` size cap, `generateGradient` deduplication
- **P3-C**: PropTypes on every component, removed all `import React`, 225 lint errors → 0
- **P3 tests**: 50 Vitest unit tests across `physics.js`, `spatialGrid.js`, `audioReducer`
- **P4 (shipped)**: 3 additional scales (A Pent Min, C Pent Maj, D Dorian); ConvolverNode reverb with synthesized IR; `localStorage` persistence; accessibility (`role`, `tabIndex`, Space key, ARIA on sliders); touch via `onPointerDown`; partial TypeScript migration (`AudioContext.tsx`, `sound.ts`, `src/types/audio.ts`)

### Pending work (current backlog)
See `.docs/BACKLOG.md` for full descriptions and effort estimates.

**P5 bugs**:
- **B1**: Distortion `oversample` is a silent no-op (set in UI/state but never applied to WaveShaperNode)
- **B2**: `cleanupAudio()` never called from `AudioProvider` — HMR/unmount leaks
- **B3**: `audioContext.resume()` never called — silent on iOS Safari
- **B4**: Lint broken — `@typescript-eslint/no-non-null-assertion` rule referenced by 2 disable comments in `sound.ts` but plugin not registered in `eslint.config.js` (2 errors). Plus 4 warnings (1 exhaustive-deps in `CircleCanvas.jsx`, 3 react-refresh in `AudioContext.tsx` for test-only exports).

**P5 architecture/quality**:
- **A1**: Add lint + test + tsc gate to deploy workflow
- **A2**: Debounce `localStorage` writes (~250 ms)
- **A3**: Continue TS migration outward (utils → hooks → shared → controls → CircleCanvas)
- **A4**: Remove dead exports + tombstone in `sound.ts`
- **A5**: Update ESLint react version (currently pinned to 18.3, project on 19)
- **A6**: Targeted `effectChains.js` tests (IR cache, IR shape, pool overflow)
- **A7**: Add `.DS_Store` to `.gitignore`
- **A8**: Collapse the two `no-non-null-assertion` disables in `sound.ts`
- **A3 Wave 1 (shipped)**: TS migration — `src/types/physics.ts` (new), `utils/physics.ts`, `utils/spatialGrid.ts`, all 4 hooks, all `shared/` components, `main.tsx`, `App.tsx`, `ScaleSelector.tsx`; `vite-env.d.ts` added
- **A11**: `lastCollisionTimes` Map (collision-pair cooldowns) grows monotonically
- **A12**: `audioPool.cleanup()` is a no-op (predicate only matches closed contexts)
- **A13**: Collapse `AudioContext.tsx` to a path-based reducer (~990 → ~150 lines)
- **A14**: Flip `tsconfig.checkJs` to `true` to surface JS→TS boundary errors

**P4 UX/features**:
- ~~**P4-1**: Ball count cap~~ ✅ done (50, FIFO eviction)
- **P4-2**: Collapsible effect sections + overflow scroll
- **P4-3**: Tremolo waveform shape UI (backend already accepts `tremolo.shape`)
- **P4-4**: Audio settings preset system
- **P4-5**: Custom favicon and OG meta tags
- **P4-6**: Make Space-to-spawn consistent with click position

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
