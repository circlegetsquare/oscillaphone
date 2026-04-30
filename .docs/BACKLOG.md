# Oscillaphone — Backlog

Items ranked by priority. Each entry has a rough effort estimate.

---

## ✅ Completed

- **P1**: Oversample setters, interval ID leak, import scoping, stub removal
- **P2**: EffectChain fully wired, `createBeep` consolidated, dual-state collapse (`sound.js` 700→453 lines), oscillator pool fixed
- **P3**: Dead file deletion, `Circle.displayName`, `exhaustive-deps` fixes, PropTypes on all components, pure HSL conversion, `colorCache` cap, `generateGradient` dedup, duplicate exports removed, `onPointerDown` touch support
- **P3**: Vitest unit tests — 50 tests across `physics.js`, `spatialGrid.js`, `audioReducer`
- **P4**: More scales — A Pent Min, C Pent Maj, D Dorian added; note groups now derived dynamically
- **P4**: ConvolverNode reverb with synthesized IR (replaced comb filter)
- **P4**: README updated
- **P4**: Persist settings to `localStorage` — deep-merged with `initialState` on load
- **P4**: Accessibility — `role="application"`, `tabIndex`, Space key spawns ball, `aria-label`/`aria-valuetext` on all sliders
- **P4**: Partial TypeScript migration — `AudioContext.tsx`, `sound.ts`, `src/types/audio.ts`; `tsc --noEmit` passes with `strict: true`
- **P4-1 / A9 / A10**: Ball cap (50 max, FIFO eviction); `removeBall` helper closes the per-ball ticker leak
- **A3 Wave 1**: TS migration — `src/types/physics.ts` (new); `utils/physics.ts`, `utils/spatialGrid.ts`, `hooks/useGSAP.ts`, `hooks/useAnimationState.ts`, `hooks/useColorPalette.ts`, `hooks/useCollisions.ts`, `components/shared/Button.tsx`, `Slider.tsx`, `Checkbox.tsx`, `ControlPanel.tsx`, `main.tsx`, `App.tsx`, `ScaleSelector.tsx`; `src/vite-env.d.ts` added; 0 errors, 62/62 tests
- **A3 Wave 2**: TS migration complete — `utils/audioPool.ts`, `utils/effectChains.ts`, `AudioControls/EffectControls.tsx`, `WallControls.tsx`, `CircleControls.tsx`, `GlobalControls.tsx`, `AudioControls/index.tsx`, `BouncingCircles/index.tsx`, `CircleCanvas.tsx`; all `.jsx`/`.js` source files deleted; `react/prop-types` disabled for `.ts/.tsx` in ESLint config; 0 errors / 3 warnings · tsc clean · 62/62 tests
- **A13**: `AudioContext.tsx` collapsed — path-based `setIn` reducer replaces 30+ action type constants, cases, and creators (~1020 → ~270 lines); `AudioAction` union reduced to 2 variants
- **A2**: `localStorage` writes debounced 250 ms via `persistTimerRef`
- **A6**: `effectChains.ts` tests — 12 tests covering IR cache key, IR shape (length/decay), pool overflow, and signal-graph wiring
- **A14 / checkJs**: `tsconfig.json` `checkJs: true`; per-file `// @ts-nocheck` on test files
- **B1**: Distortion `oversample` now applied to WaveShaperNode in `EffectChain.configure()`
- **B2**: `cleanupAudio()` returned from `AudioProvider` mount effect (closes HMR/unmount leak)
- **B3**: `resumeAudioContext()` called on every user gesture in `CircleCanvas`; `initAudioContext` also calls `.resume()` after construction
- **B4**: Lint fixed — `@typescript-eslint/eslint-plugin` registered in `eslint.config.js`; `no-non-null-assertion` disable comments removed; 0 errors / 3 known warnings
- **A1**: CI quality gate added to deploy workflow — runs `lint && test && tsc --noEmit` before build
- **A4**: Dead exports removed from `sound.ts` (`cleanupNodes`, `cleanup`, `getGlobalVolume`, `playBeep`, `_tombstone`)
- **A5**: ESLint `react.version` set to `'detect'`
- **A7**: `.DS_Store` added to `.gitignore`
- **A8**: `no-non-null-assertion` disable comments collapsed (combined with B4)
- **A11**: `lastCollisionTimes` Map pruned in `removeBall` — no longer grows monotonically
- **A12**: Dead `audioPool.cleanup()` timer removed from `sound.ts`

---

## 🔴 P5 — Bugs (third-pass review)

### ~~B1. Distortion `oversample` is a silent no-op~~ ✅
Done — `EffectChain.configure()` now sets `n.distortion.oversample = oversample`.

### ~~B2. `cleanupAudio()` is never called~~ ✅
Done — `AudioProvider` mount effect returns `() => cleanupAudio()`.

### ~~B3. Audio context never `resume()`-d~~ ✅
Done — `resumeAudioContext()` called on every user gesture; `initAudioContext` also calls `.resume()`.

### ~~B4. Lint is broken — `@typescript-eslint` plugin missing~~ ✅
Done — plugin registered; disable comments removed; 0 lint errors.

---

## 🟠 P5 — Architecture / Quality

### ~~A1. Add CI quality gate before deploy~~ ✅
Done — `npm run lint && npm test && npx tsc --noEmit` runs before build.

### ~~A2. Debounce `localStorage` persistence~~ ✅
Done — 250 ms debounce via `persistTimerRef` in `AudioContext.tsx`.

### ~~A3. TypeScript migration~~ ✅
Done — all source files migrated. `react/prop-types` disabled for `.ts/.tsx`.

### ~~A4. Remove dead exports + tombstone in `sound.ts`~~ ✅
Done — `cleanupNodes`, `cleanup`, `getGlobalVolume`, `playBeep`, `_tombstone` all removed.

### ~~A5. Update ESLint react version~~ ✅
Done — `react: { version: 'detect' }`.

### ~~A6. Targeted `effectChains` tests~~ ✅
Done — 12 tests: IR cache key, IR shape, pool overflow, signal-graph wiring.

### ~~A7. Add `.DS_Store` to `.gitignore`~~ ✅
Done.

### ~~A8. Collapse the two `no-non-null-assertion` disables in `sound.ts`~~ ✅
Done alongside B4 — disable comments removed.

### A9. ~~Resolve `removeCircleFromRender` dead code~~ ✅
Done alongside P4-1.

### A10. ~~GSAP per-ball tickers leak~~ ✅
Done alongside P4-1.

### A11. ~~`lastCollisionTimes` Map grows monotonically~~ ✅
Done — `removeBall(id)` prunes all pair-key entries for the evicted ball.

### A12. ~~`audioPool.cleanup()` is effectively a no-op~~ ✅
Done — dead cleanup timer removed from `sound.ts`.

### ~~A13. `AudioContext.tsx` boilerplate — collapse to a path-based reducer~~ ✅
Done — `setIn` helper + 2-case switch replaces 30+ action types/cases/creators (~1020 → ~270 lines).

### ~~A14. Turn on `checkJs` in tsconfig~~ ✅
Done — `checkJs: true`; test files use `// @ts-nocheck`.

---

## 🟢 P4 — UX / Features (still open)

### 1. ~~Add a ball count cap~~ ✅
Done — cap at 50, FIFO eviction via `removeBall(oldestId)` in `spawnBallAt`. See `MAX_BALLS` in [src/components/BouncingCircles/CircleCanvas.tsx](../src/components/BouncingCircles/CircleCanvas.tsx).

### 2. Collapsible effect sections in the controls panel
The full controls panel shows ~40 controls at once. Wrap each effect (Delay, Reverb, Distortion, Tremolo) in a collapsible accordion — collapsed by default when the effect is disabled. Also add `overflow-y: auto` + `max-height` for small screens.
- **Effort:** S
- **Files:** [src/components/BouncingCircles/AudioControls/EffectControls.tsx](../src/components/BouncingCircles/AudioControls/EffectControls.tsx)

### 3. Expose tremolo waveform shape in the UI
The tremolo LFO shape (`sine`, `square`, etc.) is wired through `EffectChain.configure` (`tremolo.shape` already typed in `src/types/audio.ts`). Action type, action creator, and UI control are missing.
- **Effort:** XS–S
- **Files:** [src/context/AudioContext.tsx](../src/context/AudioContext.tsx), [src/components/BouncingCircles/AudioControls/EffectControls.tsx](../src/components/BouncingCircles/AudioControls/EffectControls.tsx)

### 4. Audio settings preset system
Allow naming and saving the current audio state as a named preset in `localStorage`, with a preset picker in the UI.
- **Effort:** M
- **Files:** [src/context/AudioContext.tsx](../src/context/AudioContext.tsx), new UI component

### 5. Custom favicon and meta tags
Ships with the default Vite favicon and no `<meta name="description">`. Add a custom favicon and Open Graph tags.
- **Effort:** XS
- **Files:** [index.html](../index.html)

---

## Effort key

| Label | Approximate time |
|---|---|
| XS | < 1 hour |
| S | 1–4 hours |
| M | Half-day |
| L | Multi-day |
