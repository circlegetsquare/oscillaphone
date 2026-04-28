# Oscillaphone — Codebase Review

*Reviewed April 2026 (second deep pass)*

---

## High-Level Summary

**Oscillaphone** is a browser-based interactive musical toy. Click anywhere on the screen to spawn a colorful ball; balls bounce around and play musical notes each time they hit a wall or each other. The experience is polished: the sounds are genuinely musical (notes drawn from a user-selectable scale), the physics feel good, and the visual squish/glow animations on collision give it tactile satisfaction.

### What the app does

| Layer | What's there |
|---|---|
| **Interaction** | Click to create balls; each ball gets a random size and color |
| **Physics** | Custom elastic-collision engine with O(n²→n) spatial-grid optimization |
| **Audio** | Web Audio API oscillators → 4 optional per-type effects (delay, reverb, distortion, tremolo) → global compressor → limiter → master gain |
| **Visuals** | GSAP-powered squish/glow on collision; rotating gradient background that evolves with ball colors |
| **Controls** | Musical scale selector (C Major / A Minor / F Lydian), waveform, volume, duration, detune, all four effects — with independent settings for wall hits vs. ball-to-ball hits |

### Tech stack

- React 19 + Vite 6 (SPA, GitHub Pages deploy at `/oscillaphone/`)
- GSAP 3 (animations + physics ticker)
- Tailwind CSS 4 (installed but barely used in the active code)
- Web Audio API (no library wrapper)

### Component tree (active code only)

```
App
└── BouncingCircles (index.jsx)          — layout, button animations, speed state
    ├── AudioProvider (AudioContext.jsx) — centralized audio param state
    ├── ScaleSelector                    — 3 scale buttons
    ├── AudioControls                    — collapsible panel
    │   ├── GlobalControls               — master volume + ball speed sliders
    │   ├── CircleControls → EffectControls
    │   └── WallControls   → EffectControls
    └── CircleCanvas                     — physics loop, rendering, sound triggers
        ├── useCollisions                — physics state + spatial grid
        ├── useAnimationState            — GSAP timelines + tickers
        └── useColorPalette              — color generation + gradient building
```

### What's genuinely solid

- **Audio architecture** is sophisticated for a toy: a proper compressor→limiter→master chain prevents clipping when many balls collide at once; velocity-to-volume mapping makes fast hits louder naturally.
- **Audio node pool** (`audioPool.js`) pre-allocates Web Audio nodes to avoid garbage-collection pressure during gameplay.
- **Spatial grid** (`spatialGrid.js`) keeps collision detection fast as ball count grows.
- **Squish animations** are proportional to impact velocity — a nice touch.
- **Modular hook design** (useCollisions, useAnimationState, useColorPalette) keeps CircleCanvas from becoming a god component.
- **GSAP cleanup** is handled correctly with `timeline.kill()` and ticker removal in `useEffect` returns.

---

## Lint Status

Running `npm run lint` produces **225 errors and 11 warnings** across 22 files. The errors fall into three categories:

| Category | Count | Notes |
|---|---|---|
| `no-unused-vars` | ~50 | Majority in flat `BouncingCircles.jsx` (dead file) |
| `react/prop-types` | ~160 | All shared/effect control components lack PropTypes |
| `react/display-name` | 1 | Memoized `Circle` component in `CircleCanvas.jsx` |
| `react-hooks/exhaustive-deps` | 3 | Missing or stale ref in cleanup effects |
| `no-undef` | 2 | `getAudioPoolStats` / `getEffectChainStats` used before re-export resolves |
| `react-refresh/only-export-components` | 1 | `sound.js` exports both functions and constants |

The bulk of the noise disappears once the dead flat `BouncingCircles.jsx` file is deleted.

---

## Gaps and Issues

### 🔴 Bugs / Runtime Errors

**1. `setWallDistortionOversample` is called but never exposed by AudioContext**

`WallControls.jsx` destructures `setWallDistortionOversample` from `useAudio()`, but `AudioContext.jsx` has no `SET_WALL_DISTORTION_OVERSAMPLE` action type and never exposes that function. The call will silently resolve to `undefined`, meaning oversample changes from the UI are no-ops. (The mirrored `circleSettings` has the same gap.)

**2. The "optimized" sound path silently falls back when effect chains are exhausted**

`createOptimizedBeep` silently falls back to basic sound (no delay/reverb/distortion/tremolo) when the chain pool has nothing to give. With rapid collisions this is common and produces audible inconsistency — a burst of hits sounds different from a steady stream.

**3. `setInterval` in `initAudioContext` is never cleared**

```js
setInterval(() => { pool.cleanup() }, 30000)
```

The interval ID is not stored, so it can never be cancelled. If the audio context is re-initialized (e.g. after `cleanupAudio()` is called), a new interval accumulates alongside the old one.

**3. `getAudioMemoryStats` uses `getAudioPoolStats` / `getEffectChainStats` before the re-export is resolved**

`sound.js` re-exports these functions via ES module `export { ... } from` statements, then immediately calls them in `getAudioMemoryStats()` in the same file scope. ESLint flags these as `no-undef` (lines 1174–1175). This is a scoping issue — the re-exported names are not in the local scope of the file. The fix is to import them normally at the top.
- **Files:** `src/utils/sound.js`

**4. `setAudioOptimization` toggle is a stub that does nothing**

`sound.js` exports `setAudioOptimization(enabled)` which logs a console message but has no real effect — the comment says "This would require more refactoring to fully implement the switch." This is dead/stub code exported as a real API.
- **Files:** `src/utils/sound.js`

---

### 🟠 Architecture / Design Problems

**4. Dual state — React state and module-level variables are both sources of truth**

Every audio parameter is stored twice: once in React state in `AudioContext.jsx` and once as a `let` variable at the top of `sound.js` (`wallDelayEnabled`, `wallReverbRoomSize`, etc. — ~30 variables). The React state dispatches call into `sound.js` setter functions to keep them in sync. This creates an implicit hidden state layer that is impossible to unit-test and can diverge on hot-reload.

The right fix is one of:
- Move all audio parameter reads inside the sound-playback functions (accept them as arguments), or
- Use the React state as the single source and pass current values at call-site

**5. `createOriginalBeep` and `createOptimizedBeep` coexist without clarity**

Both functions exist in `sound.js`. The public-facing `playCollisionBeep` / `playWallCollisionBeep` route through `createOriginalBeep` (the non-optimized path), while `createOptimizedBeep` is defined but only reached on a fallback from the effect-chain path. The intent and relationship between these two is unclear and creates maintenance burden.

**6. Oscillator pooling is architecturally unsound**

`audioPool.js` pre-allocates oscillator nodes and tries to return them from a pool. However, the Web Audio spec does not allow restarting a stopped oscillator — each oscillator can only call `.start()` once. The pool code does call `createFreshNode('oscillator')` as a fallback when the pool is empty, so it still works, but the pool for oscillators is effectively always empty and serves no purpose.

**7. Reverb is a multi-tap comb filter, not a convolution reverb**

The `createReverbNetwork` function builds 4 parallel delay lines with feedback. This produces a metallic, resonant coloring — not a convincing room reverb. A proper implementation would use a `ConvolverNode` with an impulse response buffer (which can be synthesized programmatically; no audio files needed).

**8. Tremolo waveform shape is implemented but not exposed**

`sound.js` tracks `wallTremoloShape` and `circleTremoloShape` variables and passes them to `createTremoloNetwork`. However, `AudioContext.jsx` has no action type for changing shape, and the UI has no control. Users can only use sine-wave tremolo.

---

### 🟡 Code Quality

**NEW: The `EffectChain` tremolo is incomplete — it's a stub**

In `effectChains.js`, the `configure()` method for tremolo only adjusts mix/depth gain values but never creates or starts an LFO oscillator. The comment in the file says "full implementation would need LFO". This means when the optimized path (`createOptimizedBeep`) is used, tremolo is silently non-functional. The original path does have a working LFO via `createTremoloNetwork`.
- **Files:** `src/utils/effectChains.js`

**NEW: `EffectChain` reverb only uses 2 of the 4 allocated delay nodes**

The pool allocates `reverb1` and `reverb2` delay nodes but the wiring in `wireChain()` doesn't actually connect them — there is no reverb signal path in the effect chain at all. The `configure()` method sets gain values for `reverbMix`/`reverbDry` but those nodes are never in the signal path. Reverb is effectively silent in the optimized path.
- **Files:** `src/utils/effectChains.js`

**NEW: `EffectChain` distortion node is similarly unwired**

The `distortion` (waveshaper) node and `distortionMix`/`distortionDry` gain nodes exist in the pool but `wireChain()` does not connect them into the signal path. Distortion is also non-functional in the optimized path.
- **Files:** `src/utils/effectChains.js`

**Summary:** The optimized effect chain path (`createOptimizedBeep`, used as fallback from `createOriginalBeep`) only reliably implements delay. Reverb, distortion, and tremolo are all stubs. Because `createOriginalBeep` is the primary path (see `const createBeep = createOriginalBeep`), this doesn't break the app — but it means the entire `effectChains.js` investment is not delivering value.

**NEW: `sound.js` re-exports `AVAILABLE_SCALES` and `WAVEFORMS` twice in the same file**

Both constants are exported at two different points in `sound.js` (around line 200 and again around line 700+). ES modules deduplicate this at runtime, but it's confusing and causes a `react-refresh` lint warning about mixing component and constant exports.

**NEW: `AudioContext.jsx` syncs ALL state on every state change (n×m setter calls)**

The main `useEffect` in `AudioProvider` runs every time ANY part of the state changes, calling all ~30 setter functions into `sound.js` on every dispatch. Changing a single knob triggers `setWallDuration`, `setWallDetune`, `setWallWaveform`, ... all 30+ setters. This is harmless for performance (the setters are cheap), but it amplifies the dual-state problem and makes the sync hard to reason about.

**NEW: `GlobalVolumeControl.jsx` is never rendered**

`GlobalVolumeControl.jsx` is a standalone component with its own `ControlPanel` wrapper and a single volume slider. The active controls panel uses `GlobalControls.jsx` instead, which has both master volume and ball speed. `GlobalVolumeControl.jsx` appears to be a leftover from an earlier design.
- **Files:** `src/components/BouncingCircles/AudioControls/GlobalVolumeControl.jsx`

**9. `convertHSLToRGBA` uses a DOM element as a color-parsing hack**

```js
const div = document.createElement('div')
div.style.color = hslColor
document.body.appendChild(div)
const rgbColor = window.getComputedStyle(div).color
document.body.removeChild(div)
```

This is a common trick but it appends/removes a DOM node on every new color. HSL→RGB conversion is a well-known formula; doing it in pure JS removes the DOM dependency and is faster.

**10. `colorCache` grows without bound**

The `colorCache = new Map()` at module level in `CircleCanvas.jsx` never evicts entries. In a typical session this is harmless (a finite number of colors), but it's a latent memory leak if the app runs for extended periods.

**11. `generateGradient` is duplicated**

The function exists in both `useColorPalette.js` (used by CircleCanvas) and `BouncingCircles/index.jsx` (used for the button hover effect). The two implementations are nearly identical but not identical. They should share one implementation.

**12. No TypeScript**

The audio parameter structures (nested objects with ~30 fields each), the circle physics state, and the AudioContext API surface have no type contracts. Refactoring is risky and IDE support is limited.

**13. No tests**

Zero test files exist anywhere in the repo. The physics functions in `physics.js` (`resolveCollision`, `checkCircleCollision`) are pure and straightforward to test. The AudioContext reducer is also pure and easy to cover.

---

### 🟡 Dead Code

**NEW: `src/components/BouncingCircles.jsx` (flat, 1,801 lines) is the original monolith — fully functional but entirely superseded**

This file is the complete pre-refactor implementation of the app. It includes its own physics loop, all audio state management, all UI controls, and all animation logic — all in one component. It was kept when the modular architecture was built. ESLint reports ~40 errors in it (all unused imports from a superseded import list). It is never imported anywhere and should be deleted. It accounts for nearly half the total lint error count.

**14. Several files/components are never rendered**

| File | Status |
|---|---|
| `src/components/AnimatedHero.jsx` | Not imported anywhere |
| `src/components/NavBar.jsx` | Not imported anywhere |
| `src/components/ScrollSection.jsx` | Not imported anywhere |
| `src/layouts/MainLayout.jsx` | Not imported anywhere (has its own lint error) |
| `src/contexts/` | Empty directory |
| `src/utils/animations.js` | Exports `slideIn`, `pageTransition`, etc. — none used by active code |
| `src/components/BouncingCircles/AudioControls/GlobalVolumeControl.jsx` | Not imported anywhere (superseded by `GlobalControls.jsx`) |

These appear to be scaffolding from the initial project template or superseded by the refactor. They add noise when reading the codebase.

**15. `src/components/BouncingCircles.jsx` (flat) — superseded monolith**

Covered above — 1,801-line original implementation, never imported, should be deleted.

**NEW: `cleanupAudioNodes` in `sound.js` is defined twice**

There are two definitions of `cleanupAudioNodes` in `sound.js` — one near the top of the file and the second one appears again later in the file (around the note group definitions area, which is duplicated content). This is a copy-paste artifact from the file's evolution.

---

### 🟡 UX / Feature Gaps

**16. No touch / mobile support**

Ball creation is click-only (`onClick` on the container). On a phone or tablet, touch events are not handled, so the app doesn't work on mobile.

**17. No ball count limit**

Users can click indefinitely. With 50+ balls the browser tab can bog down from the physics loop and audio node creation. A simple soft cap (e.g. 30 balls, oldest removed) would keep performance stable.

**18. No settings persistence**

All audio settings reset to defaults on page refresh. Browser `localStorage` could persist the AudioContext state between sessions with minimal effort.

**19. Controls panel is very long with no progressive disclosure**

The panel shows all four effects (delay, reverb, distortion, tremolo) fully expanded for both wall and circle sounds simultaneously. This is ~40 controls visible at once. Collapsible sections per effect would significantly improve usability.

**20. Only 3 musical scales**

C Major, A Minor, and F Lydian cover a narrow range. Common additions: pentatonic scales (very forgiving — nearly every note sounds good together), blues scale, chromatic mode.

**21. README undersells the feature set**

The README lists delay as a feature but doesn't mention reverb, distortion, or tremolo, which are the most interesting effects.

**22. Accessibility: no keyboard support, no ARIA roles**

The entire UI is click/mouse driven. The container div uses `onMouseDown` with no keyboard equivalent. Screen readers receive no semantic information. Adding `role="application"` and basic keyboard handling (e.g. Space to spawn a ball) would be a meaningful improvement.

**23. `index.html` uses the default Vite favicon (`/vite.svg`)**

The app ships with a Vite boilerplate favicon. A custom icon would make it feel finished.

**24. Controls panel has no scrolling on small screens**

The controls panel renders as a fixed-position overlay. On viewports shorter than ~800px (e.g., a laptop with the browser partially sized), the bottom controls are cut off with no way to scroll to them.

---

## Opportunities for Improvement

These are prioritized roughly by impact-to-effort ratio.

### Quick wins (low effort, noticeable impact)

1. **Delete the dead-code files** — the monolithic `BouncingCircles.jsx` alone clears ~40 lint errors; deleting it + other dead files removes ~80% of total lint noise immediately
2. **Fix `setWallDistortionOversample` / `setCircleDistortionOversample` bug** — add action type and action creator to AudioContext (30 min)
3. **Fix the `setInterval` ID leak** — store ID, clear in `cleanupAudio()` (5 min)
4. **Fix `getAudioPoolStats`/`getEffectChainStats` import in `sound.js`** — change re-export to a normal `import` at the top (5 min)
5. **Remove `setAudioOptimization` stub** — does nothing, exported as real API
6. **Add `displayName` to the memoized `Circle` component** in `CircleCanvas.jsx` — one-liner
7. **Add a ball count cap** — keeps performance predictable
8. **Add touch/pointer event support** — change `onMouseDown` to `onPointerDown`, one character change

### Medium investment, high payoff

9. **Wire the `EffectChain` reverb, distortion, and tremolo signal paths** — `wireChain()` needs these connected; once done, `createOptimizedBeep` replaces `createOriginalBeep` and the node pool delivers its intended value
10. **Collapse the dual-state pattern** — pass current settings as arguments to playback functions; removes the 30+ module-level variables and the entire sync `useEffect`
11. **Add `localStorage` persistence** for AudioContext state
12. **Add collapsible sections + overflow scroll to the controls panel** — addresses both progressive disclosure and small-screen clipping
13. **Expose tremolo shape in the UI** — backend already supports it

### Larger investments

14. **TypeScript migration** — start with `physics.js` and the AudioContext reducer
15. **Unit tests** (Vitest) — physics functions and the AudioContext reducer are pure and easy targets
16. **Replace reverb with a `ConvolverNode`** — programmatically generated impulse response
17. **More musical scales** — pentatonic is the most accessible addition
18. **Preset system** — save/load named audio configurations to `localStorage`
19. **Accessibility** — keyboard support (`Space` to spawn), ARIA roles, focus management

---

## File-by-File Health Summary

| File | Health | Notes |
|---|---|---|
| `src/utils/physics.js` | ✅ Good | Clean pure functions; easy to unit test |
| `src/utils/spatialGrid.js` | ✅ Good | Well-structured, self-contained |
| `src/utils/audioPool.js` | ⚠️ Fair | Good idea; oscillator pooling spec-incompatible but pool knows this and fallbacks gracefully |
| `src/utils/effectChains.js` | 🔴 Incomplete | Reverb, distortion, and tremolo are unconnected stubs; only delay works in the optimized path |
| `src/utils/sound.js` | 🔴 Complex | 1,198 lines; module-level mutable state; two parallel `createBeep` implementations; duplicated constant exports; `getAudioMemoryStats` import scoping bug; stub export |
| `src/context/AudioContext.jsx` | ⚠️ Fair | Clean reducer pattern but 979 lines, mostly boilerplate; entire state re-synced on every dispatch; missing oversample action types |
| `src/hooks/useCollisions.js` | ✅ Good | Clear responsibilities, good cleanup, spatial grid well-integrated |
| `src/hooks/useAnimationState.js` | ⚠️ Fair | Solid GSAP abstraction; has ref-in-cleanup lint warning |
| `src/hooks/useColorPalette.js` | ✅ Good | Clean; duplicated gradient logic is minor |
| `src/components/BouncingCircles/CircleCanvas.jsx` | ⚠️ Fair | 805 lines; DOM color hack; unbounded colorCache; missing `displayName` |
| `src/components/BouncingCircles/index.jsx` | ⚠️ Fair | Duplicated gradient logic; otherwise clean |
| `src/components/BouncingCircles/AudioControls/*` | ✅ Good | Thin, composable wrapper components; missing PropTypes |
| `src/components/shared/*` | ✅ Good | Clean reusable components; missing PropTypes |
| `src/components/BouncingCircles.jsx` (flat) | 🗑️ Delete | 1,801-line original monolith; never imported; ~40 lint errors |
| Dead-code files (AnimatedHero, NavBar, GlobalVolumeControl, etc.) | 🗑️ Delete | Unused scaffolding |
