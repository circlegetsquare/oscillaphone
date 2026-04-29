# Oscillaphone — Backlog

Items ranked by priority. Each entry has a rough effort estimate.

---

## ✅ Completed

- **P1**: Oversample setters, interval ID leak, import scoping, stub removal
- **P2**: EffectChain fully wired, `createBeep` consolidated, dual-state collapse (`sound.js` 700→453 lines), oscillator pool fixed
- **P3**: Dead file deletion, `Circle.displayName`, `exhaustive-deps` fixes, PropTypes on all components, pure HSL conversion, `colorCache` cap, `generateGradient` dedup, duplicate exports removed, `onPointerDown` touch support
- **P3**: Vitest unit tests — 50 tests across `physics.js`, `spatialGrid.js`, `audioReducer`
- **P4-17**: More scales — A Pent Min, C Pent Maj, D Dorian added; note groups now derived dynamically
- **P4-18**: ConvolverNode reverb with synthesized IR (replaced comb filter)
- **P4-20**: README updated

---

## 🟢 P4 — UX / Features

### 1. Add a ball count cap
No limit on ball creation. With 50+ balls the physics loop bogs down. Automatically remove the oldest ball when count exceeds a configurable cap (~25–30).
- **Effort:** XS–S
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 2. Collapsible effect sections in the controls panel
The full controls panel shows ~40 controls at once. Wrap each effect (Delay, Reverb, Distortion, Tremolo) in a collapsible accordion — collapsed by default when the effect is disabled. Also add `overflow-y: auto` + `max-height` for small screens.
- **Effort:** S
- **Files:** `src/components/BouncingCircles/AudioControls/EffectControls.jsx`

### 3. Persist settings to `localStorage`
All audio settings reset on page refresh. Serialize `AudioContext` state to `localStorage` on every change; load it back as initial state on mount.
- **Effort:** S
- **Files:** `src/context/AudioContext.jsx`

### 4. Expose tremolo waveform shape in the UI
The tremolo LFO shape (`sine`, `square`, etc.) is wired in `effectChains.js` but there's no action type, action creator, or UI control for it. Backend is ready — just needs wiring.
- **Effort:** XS–S
- **Files:** `src/context/AudioContext.jsx`, `src/components/BouncingCircles/AudioControls/EffectControls.jsx`

### 5. Audio settings preset system
Allow naming and saving the current audio state as a named preset in `localStorage`, with a preset picker in the UI.
- **Effort:** M
- **Files:** `src/context/AudioContext.jsx`, new UI component

### 6. Accessibility: keyboard support + ARIA
The UI is mouse-only. Add `role="application"`, keyboard handler (`Space` to spawn a ball), and `aria-label` on all sliders and checkboxes.
- **Effort:** S–M
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`, shared components

### 7. Custom favicon and meta tags
Ships with the default Vite favicon and no `<meta name="description">`. Add a custom favicon and Open Graph tags.
- **Effort:** XS
- **Files:** `index.html`

### 8. Add TypeScript
Migrate incrementally — start with `physics.js`, the AudioContext reducer, and the circle state shape.
- **Effort:** L (multi-day)
- **Files:** All source files

---

## Effort key

| Label | Approximate time |
|---|---|
| XS | < 1 hour |
| S | 1–4 hours |
| M | Half-day |
| L | Multi-day |


---

## 🔴 P1 — Bugs (fix before next release)

### 1. Fix `setWallDistortionOversample` / `setCircleDistortionOversample` silent no-ops
`WallControls.jsx` and `CircleControls.jsx` destructure these setters from `useAudio()`, but `AudioContext.jsx` has no matching action type or action creator. Oversample changes from the UI are silently dropped.
- **Effort:** XS (30 min)
- **Files:** `src/context/AudioContext.jsx`, `WallControls.jsx`, `CircleControls.jsx`

### 2. Clear the `setInterval` ID in `initAudioContext`
The cleanup interval for the audio node pool is started but its ID is never stored, so it cannot be cancelled. Re-initializing audio accumulates intervals.
- **Effort:** XS (5 min)
- **Files:** `src/utils/sound.js`

### 3. Fix `getAudioPoolStats`/`getEffectChainStats` import scoping bug
`sound.js` re-exports these functions via `export { ... } from` but then calls them by name in `getAudioMemoryStats()` in the same file scope. ESLint flags them as `no-undef`. Change to a standard `import` at the top of the file.
- **Effort:** XS (5 min)
- **Files:** `src/utils/sound.js`

### 4. Remove `setAudioOptimization` stub export
This function logs a message but has a comment saying "would require more refactoring to implement." It is exported as a public API and is misleading. Delete it (or implement it).
- **Effort:** XS
- **Files:** `src/utils/sound.js`

---

## 🟠 P2 — Architecture (address in next sprint)

### 5. Wire `EffectChain` reverb, distortion, and tremolo signal paths
`effectChains.js` pre-allocates nodes for all four effects but only delay is connected in `wireChain()`. Reverb, distortion, and tremolo nodes exist but are never in the signal path — they are dead weight. The `configure()` method sets parameters on unreachable nodes. Once wired, `createOptimizedBeep` can fully replace `createOriginalBeep`.
- **Effort:** M
- **Files:** `src/utils/effectChains.js`

### 6. Consolidate the two `createBeep` implementations
`sound.js` has both `createOriginalBeep` (active) and `createOptimizedBeep` (reachable only as a fallback). `const createBeep = createOriginalBeep` explicitly leaves the optimized path unused. After item #5 is done, delete `createOriginalBeep` and promote the optimized path.
- **Effort:** S
- **Files:** `src/utils/sound.js`

### 7. Collapse the dual-state pattern in `sound.js`
Every audio parameter lives in both React state (`AudioContext.jsx`) and as a module-level `let` variable in `sound.js` (~30 variables). Fix: pass current settings as arguments to `playCollisionBeep`/`playWallCollisionBeep`; delete the module-level variables and the entire 30-setter sync `useEffect`.
- **Effort:** M
- **Files:** `src/utils/sound.js`, `src/context/AudioContext.jsx`, `src/components/BouncingCircles/CircleCanvas.jsx`

### 8. Fix oscillator pool (Web Audio spec issue)
`audioPool.js` pre-allocates oscillator nodes, but the Web Audio spec forbids restarting a stopped oscillator. The pool always falls back to creating fresh ones. Remove oscillator pre-allocation.
- **Effort:** XS
- **Files:** `src/utils/audioPool.js`

---

## 🟡 P3 — Code quality / housekeeping

### 9. Delete all dead-code files
These are unused scaffolding or superseded implementations:
- `src/components/BouncingCircles.jsx` — 1,801-line original monolith; accounts for ~40 lint errors
- `src/components/AnimatedHero.jsx`
- `src/components/NavBar.jsx`
- `src/components/ScrollSection.jsx`
- `src/layouts/MainLayout.jsx`
- `src/contexts/` (empty directory)
- `src/utils/animations.js`
- `src/components/BouncingCircles/AudioControls/GlobalVolumeControl.jsx` (superseded by `GlobalControls.jsx`)

Deleting the flat `BouncingCircles.jsx` alone clears ~80% of total lint errors.
- **Effort:** XS

### 10. Add `displayName` to the memoized `Circle` component
Missing `displayName` on the `React.memo()`-wrapped `Circle` in `CircleCanvas.jsx` causes a lint error and poor DevTools display.
- **Effort:** XS (one line)
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 11. Fix `react-hooks/exhaustive-deps` warnings
Three warnings: `isAnimating` missing in a dependency array (`BouncingCircles.jsx`), and two warnings about ref values captured in cleanup functions (`useAnimationState.js`). Copy the ref value to a local variable inside the effect before use in cleanup.
- **Effort:** XS
- **Files:** `src/hooks/useAnimationState.js`, `src/components/BouncingCircles.jsx` (dead file — resolved by deletion)

### 12. Add PropTypes to all shared and control components
160 `react/prop-types` lint errors across `EffectControls.jsx`, `Button.jsx`, `Slider.jsx`, `Checkbox.jsx`, `ControlPanel.jsx`, `GlobalControls.jsx`, and `CircleCanvas.jsx`. These are the dominant source of lint noise after the dead-file deletion.
- **Effort:** S
- **Files:** All `src/components/shared/*`, `src/components/BouncingCircles/AudioControls/EffectControls.jsx`, `CircleCanvas.jsx`

### 13. Replace DOM-based `convertHSLToRGBA` with pure math
`CircleCanvas.jsx` appends/removes a `<div>` to convert HSL colors to RGBA. Replace with a standard HSL→RGB formula.
- **Effort:** XS
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 14. Cap `colorCache` size
The `colorCache = new Map()` in `CircleCanvas.jsx` never evicts entries. Add a max-size eviction.
- **Effort:** XS
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 15. Deduplicate `generateGradient`
The function exists in both `useColorPalette.js` and `BouncingCircles/index.jsx`. Remove the copy in `index.jsx` and use the hook's version.
- **Effort:** XS
- **Files:** `src/components/BouncingCircles/index.jsx`

### 16. Remove duplicate `AVAILABLE_SCALES` / `WAVEFORMS` exports in `sound.js`
Both constants are exported at two different points in the same file. Remove the second occurrence.
- **Effort:** XS
- **Files:** `src/utils/sound.js`

### 17. Replace `onMouseDown` with `onPointerDown`
One-character change that enables mobile touch support and also covers stylus input.
- **Effort:** XS
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 18. Add TypeScript
Start with the most-typed files: `physics.js`, the AudioContext reducer, and the circle state shape. Migrate incrementally.
- **Effort:** L (multi-day, incremental)

### 19. Add unit tests (Vitest)
Priority targets: `physics.js` (pure functions), the AudioContext reducer, and `spatialGrid.js`. Vitest is zero-config with Vite.
- **Effort:** S–M

---

## 🟢 P4 — UX / Features

### 20. Add a ball count cap
No limit on ball creation. With 50+ balls the physics loop bogs down. Automatically remove the oldest ball when the count exceeds a configurable cap (~25–30).
- **Effort:** XS–S
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 21. Collapsible effect sections in the controls panel
Wrap each effect (Delay, Reverb, Distortion, Tremolo) in a collapsible accordion, collapsed by default when the effect is disabled. Also add `overflow-y: auto` + `max-height` to prevent controls being cut off on small screens.
- **Effort:** S
- **Files:** `src/components/BouncingCircles/AudioControls/EffectControls.jsx`

### 22. Persist settings to `localStorage`
All audio settings reset on page refresh. A `useEffect` that serializes AudioContext state to `localStorage` (and a matching initializer) would preserve user configurations between sessions.
- **Effort:** S
- **Files:** `src/context/AudioContext.jsx`

### 23. Expose tremolo waveform shape in the UI
`sound.js` already tracks `wallTremoloShape` / `circleTremoloShape`, but no action type, action creator, or UI control exists. The backend is ready — just needs wiring.
- **Effort:** XS–S
- **Files:** `src/context/AudioContext.jsx`, `src/components/BouncingCircles/AudioControls/EffectControls.jsx`

### 24. Add more musical scales
Current scales are a thin set. High-value additions:
- Pentatonic Minor / Major (very forgiving — nearly always harmonious)
- Blues scale
- Dorian mode
- **Effort:** XS per scale
- **Files:** `src/utils/sound.js`

### 25. Replace reverb with a `ConvolverNode`
The current "reverb" is 4 parallel comb filters — metallic-sounding. A `ConvolverNode` with a programmatically generated impulse response (exponentially decaying white noise) would produce a convincingly room-like reverb at no extra cost.
- **Effort:** S–M
- **Files:** `src/utils/sound.js`

### 26. Audio settings preset system
Allow naming and saving the current audio state as a named preset in `localStorage`, with a preset picker in the UI.
- **Effort:** M
- **Files:** `src/context/AudioContext.jsx`, new UI component

### 27. Accessibility: keyboard support + ARIA
The entire UI is mouse-only. Add `role="application"`, keyboard handler (`Space` to spawn a ball), and focus management. Also add `aria-label` attributes to all sliders and checkboxes.
- **Effort:** S–M
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`, shared components

### 28. Custom favicon and meta tags
The app ships with the default Vite favicon (`/vite.svg`) and has no `<meta name="description">`. Add a custom favicon and Open Graph tags.
- **Effort:** XS
- **Files:** `index.html`

### 29. Update README to reflect full feature set
The README only mentions delay as an audio effect; reverb, distortion, and tremolo are not listed.
- **Effort:** XS
- **Files:** `README.md`

---

## Effort key

| Label | Approximate time |
|---|---|
| XS | < 1 hour |
| S | 1–4 hours |
| M | Half-day |
| L | Multi-day |

---

## 🔴 P1 — Bugs (fix before next release)

### 1. Fix `setWallDistortionOversample` / `setCircleDistortionOversample` silent no-ops
`WallControls.jsx` and `CircleControls.jsx` destructure these setters from `useAudio()`, but `AudioContext.jsx` has no matching action type or action creator. Oversample changes from the UI are silently dropped.
- **Effort:** XS (30 min) — add action type, case in reducer, and action creator
- **Files:** `src/context/AudioContext.jsx`, `src/components/BouncingCircles/AudioControls/WallControls.jsx`, `CircleControls.jsx`

### 2. Clear the `setInterval` in `initAudioContext`
The cleanup interval for the audio node pool is started but its ID is never stored, so it cannot be cancelled. If `cleanupAudio()` is called and audio is re-initialized, intervals accumulate.
- **Effort:** XS (5 min) — store ID, clear it in `cleanupAudio()`
- **Files:** `src/utils/sound.js`

---

## 🟠 P2 — Architecture (address in next sprint)

### 3. Collapse the dual-state pattern in `sound.js`
Every audio parameter lives in both React state (`AudioContext.jsx`) and as a module-level `let` variable in `sound.js` (~30 variables). These are kept in sync by setter functions, creating a hidden state layer that can diverge and can't be unit-tested. Fix: pass current settings as arguments to `playCollisionBeep` / `playWallCollisionBeep` and remove the module-level variables.
- **Effort:** M (half-day) — affects all audio setter functions and call-sites in CircleCanvas
- **Files:** `src/utils/sound.js`, `src/context/AudioContext.jsx`, `src/components/BouncingCircles/CircleCanvas.jsx`

### 4. Consolidate the two `createBeep` implementations
`sound.js` contains both `createOriginalBeep` (used by the public API) and `createOptimizedBeep` (defined but only reached as a fallback from the effect-chain path). The relationship between them is unclear. One should be removed or they should be explicitly merged.
- **Effort:** S — audit call paths, pick one, delete the other
- **Files:** `src/utils/sound.js`

### 5. Fix oscillator pool (Web Audio spec issue)
`audioPool.js` pre-allocates and pools oscillator nodes, but the Web Audio spec forbids restarting a stopped oscillator — each can only call `.start()` once. The pool always falls back to creating a fresh oscillator, making the pool slot wasted memory. Remove oscillators from the pool and always create them fresh.
- **Effort:** XS — remove oscillator pre-allocation and pooling logic
- **Files:** `src/utils/audioPool.js`

---

## 🟡 P3 — Code quality

### 6. Delete dead-code files
These are unused scaffolding from the project template and add noise:
- `src/components/AnimatedHero.jsx`
- `src/components/NavBar.jsx`
- `src/components/ScrollSection.jsx`
- `src/layouts/MainLayout.jsx`
- `src/contexts/` (empty directory)
- `src/utils/animations.js` (exports nothing used by active code)
- `src/components/BouncingCircles.jsx` (flat file; superseded by `BouncingCircles/index.jsx`)
- **Effort:** XS

### 7. Replace DOM-based color conversion with pure math
`CircleCanvas.jsx` converts HSL colors to RGBA by appending a `<div>` to the DOM, reading `getComputedStyle`, then removing the element. Replace with a direct HSL→RGB math function.
- **Effort:** XS
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 8. Deduplicate `generateGradient`
The same gradient-building function exists in both `useColorPalette.js` and `BouncingCircles/index.jsx`. Move the canonical version to the hook and have `index.jsx` consume it.
- **Effort:** XS
- **Files:** `src/hooks/useColorPalette.js`, `src/components/BouncingCircles/index.jsx`

### 9. Cap `colorCache` size
The `colorCache = new Map()` in `CircleCanvas.jsx` grows without eviction. Add a max-size eviction (e.g. delete oldest when > 100 entries).
- **Effort:** XS
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 10. Add TypeScript
Start with the most-typed files: `physics.js`, the AudioContext reducer, and the circle state shape. Migrate incrementally.
- **Effort:** L (multi-day, incremental)
- **Files:** All source files

### 11. Add unit tests (Vitest)
Vitest is zero-config with Vite. Priority targets: `physics.js` (pure functions), the AudioContext reducer, and `spatialGrid.js`.
- **Effort:** S–M
- **Files:** New `src/**/*.test.js` files + `vite.config.js` test config

---

## 🟢 P4 — UX / Features

### 12. Add touch / pointer event support
Replace `onClick` with `onPointerDown` on the canvas container — one-line change that enables ball creation on phones and tablets.
- **Effort:** XS
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 13. Add a ball count cap
No limit on ball creation. With 50+ balls the physics loop and audio nodes bog down the tab. Automatically remove the oldest ball when the count exceeds a configurable cap (~25–30).
- **Effort:** XS–S
- **Files:** `src/components/BouncingCircles/CircleCanvas.jsx`

### 14. Collapsible effect sections in the controls panel
The full controls panel shows ~40 controls at once. Wrap each effect (Delay, Reverb, Distortion, Tremolo) in a collapsible accordion section — collapsed by default if the effect is disabled.
- **Effort:** S
- **Files:** `src/components/BouncingCircles/AudioControls/EffectControls.jsx`

### 15. Persist settings to `localStorage`
All audio settings reset on page refresh. A `useEffect` that serializes AudioContext state to `localStorage` (and a matching initializer) would preserve user configurations between sessions.
- **Effort:** S
- **Files:** `src/context/AudioContext.jsx`

### 16. Expose tremolo waveform shape in the UI
`sound.js` already tracks `wallTremoloShape` / `circleTremoloShape`, but no action type, action creator, or UI control exists for it. The backend is ready — just needs wiring.
- **Effort:** XS–S
- **Files:** `src/context/AudioContext.jsx`, `src/components/BouncingCircles/AudioControls/EffectControls.jsx`

### 17. Add more musical scales
Current scales (C Major, A Minor, F Lydian) are a thin set. High-value additions:
- Pentatonic Minor / Major (very forgiving — nearly always sounds harmonious)
- Blues scale
- Dorian mode
- **Effort:** XS per scale (just add a new entry to `SCALES` and the note groups in `sound.js`)
- **Files:** `src/utils/sound.js`

### 18. Replace reverb with a `ConvolverNode`
The current "reverb" is 4 parallel comb filters — metallic-sounding. A `ConvolverNode` with a programmatically generated impulse response (exponentially decaying white noise) would produce a convincingly room-like reverb at no extra cost.
- **Effort:** S–M
- **Files:** `src/utils/sound.js`

### 19. Audio settings preset system
Allow naming and saving the current audio state as a named preset, stored in `localStorage`, with a preset picker in the UI. Useful for returning to favourite configurations.
- **Effort:** M
- **Files:** `src/context/AudioContext.jsx`, new UI component

### 20. Update README to reflect full feature set
The README only mentions delay as an audio effect; reverb, distortion, and tremolo are not listed. Update to give an accurate picture of what the app does.
- **Effort:** XS
- **Files:** `README.md`

---

## Effort key

| Label | Approximate time |
|---|---|
| XS | < 1 hour |
| S | 1–4 hours |
| M | Half-day |
| L | Multi-day |
