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
- **A3 Wave 1**: TS migration — `src/types/physics.ts` (new); `utils/physics.ts`, `utils/spatialGrid.ts`, `hooks/useGSAP.ts`, `hooks/useAnimationState.ts`, `hooks/useColorPalette.ts`, `hooks/useCollisions.ts`, `components/shared/Button.tsx`, `Slider.tsx`, `Checkbox.tsx`, `ControlPanel.tsx`, `main.tsx`, `App.tsx`, `ScaleSelector.tsx`; `src/vite-env.d.ts` added; 0 errors, 62/62 tests (calls `removeTicker`, `removeCircle`, kills GSAP squish + glow tweens, drops DOM ref); `removeCircleFromRender` is no longer dead code

---

## 🔴 P5 — Bugs (third-pass review)

### B1. Distortion `oversample` is a silent no-op
The UI control, action types, reducer cases, default state, and persistence are wired, but `EffectChain.configure()` never sets `n.distortion.oversample`, and `audioPool.resetNode` always resets it to `'none'` on checkout. Fix: add `n.distortion.oversample = settings.distortion.oversample` in the distortion block of `configure()`; remove the `oversample = 'none'` reset from `audioPool` (or leave it — `configure()` will overwrite).
- **Effort:** XS
- **Files:** [src/utils/effectChains.js](../src/utils/effectChains.js), [src/utils/audioPool.js](../src/utils/audioPool.js)

### B2. `cleanupAudio()` is never called
`AudioProvider`'s mount effect initializes the audio context but returns no cleanup function. HMR / unmount leaks the context, the 30-second cleanup `setInterval`, and pool-allocated nodes. Fix: return `() => cleanupAudio()` from the mount effect.
- **Effort:** XS
- **Files:** [src/context/AudioContext.tsx](../src/context/AudioContext.tsx)

### B3. Audio context never `resume()`-d
`initAudioContext` constructs the context but never calls `.resume()`. iOS Safari (and some Android browsers) keep new contexts in `suspended` state until an explicit resume from a user gesture — the first click currently may not produce sound. Fix: call `audioContext.resume()` after construction (and again from `playCollisionBeep` / `playWallCollisionBeep` if state is `'suspended'`).
- **Effort:** XS
- **Files:** [src/utils/sound.ts](../src/utils/sound.ts)

### B4. Lint is broken — `@typescript-eslint` plugin missing
Two `eslint-disable-next-line @typescript-eslint/no-non-null-assertion` comments in [src/utils/sound.ts](../src/utils/sound.ts) reference a rule that isn't registered. [eslint.config.js](../eslint.config.js) only imports `@typescript-eslint/parser`, not `@typescript-eslint/eslint-plugin`. ESLint emits **2 errors** (`Definition for rule ... was not found`) plus 4 pre-existing warnings (1 `exhaustive-deps` in `CircleCanvas.jsx` line 788; 3 `react-refresh/only-export-components` in `AudioContext.tsx` for the test-only `audioReducer` / `initialState` / `ActionTypes` exports). Fix: either `npm install --save-dev @typescript-eslint/eslint-plugin` and add it to the TS override block, or extract an `assertContext()` helper to drop the non-null assertions entirely (combines with A8).
- **Effort:** XS
- **Files:** [eslint.config.js](../eslint.config.js), [src/utils/sound.ts](../src/utils/sound.ts)

---

## 🟠 P5 — Architecture / Quality

### A1. Add CI quality gate before deploy
[.github/workflows/deploy.yml](../.github/workflows/deploy.yml) runs `npm ci && npm run build` only. Add a step that runs `npm run lint && npm test && npx tsc --noEmit` before `npm run build`. Also confirm the workflow's `branches: [main]` matches the active branch (currently `dev_branch` per repo memory).
- **Effort:** S
- **Files:** [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

### A2. Debounce `localStorage` persistence
The persist `useEffect` runs on every dispatch, including ~60 Hz slider drags. Wrap in a `setTimeout`/`clearTimeout` debounce (~250 ms) or write on `pointerup`.
- **Effort:** XS
- **Files:** [src/context/AudioContext.tsx](../src/context/AudioContext.tsx)

### A3. Continue TypeScript migration outward *(Wave 1 complete)*
Wave 1 shipped: `src/types/physics.ts`, all pure utils, all hooks, all `shared/*` components, `main.tsx`, `App.tsx`, `ScaleSelector.tsx`. **Wave 2 remaining:** `audioPool.js`, `effectChains.js`, `AudioControls/` components, `BouncingCircles/index.jsx`, `CircleCanvas.jsx`.
- **Effort:** M (remaining files are all complex; CircleCanvas alone is ~870 lines)
- **Files:** `src/utils/audioPool.js`, `src/utils/effectChains.js`, `src/components/BouncingCircles/AudioControls/*.jsx`, `src/components/BouncingCircles/index.jsx`, `src/components/BouncingCircles/CircleCanvas.jsx`

### A4. Remove dead exports + tombstone in `sound.ts`
`cleanupNodes`, `cleanup`, `getGlobalVolume`, `playBeep`, and `_tombstone` (with `void _tombstone`) have no callers. The `_tombstone` arrow can be a one-line comment.
- **Effort:** XS
- **Files:** [src/utils/sound.ts](../src/utils/sound.ts)

### A5. Update ESLint react version
`eslint.config.js` declares `react: { version: '18.3' }`; project is on React 19. Use `'detect'` or `'19'`.
- **Effort:** XS
- **Files:** [eslint.config.js](../eslint.config.js)

### A6. Targeted `effectChains.js` tests
The IR-cache key, the impulse-response shape (length, decay), and the pool-overflow path are pure logic worth testing. The signal graph is hard to mock; prefer extracting helpers to keep tests focused.
- **Effort:** S
- **Files:** new `src/utils/effectChains.test.js`, light refactor of `effectChains.js`

### A7. Add `.DS_Store` to `.gitignore`
- **Effort:** XS

### A8. Collapse the two `no-non-null-assertion` disables in `sound.ts`
Lines ~295, ~316. Either extract an `assertContext()` helper or have `initAudioContext()` return the context. Both reads happen immediately after init. Combines with B4 — dropping the assertions also removes the broken disable comments.
- **Effort:** XS
- **Files:** [src/utils/sound.ts](../src/utils/sound.ts)

### A9. ~~Resolve `removeCircleFromRender` dead code~~ ✅
Done alongside P4-1 — the helper is now called from `removeBall` for ball-cap eviction.

### A10. ~~GSAP per-ball tickers leak~~ ✅
Done alongside P4-1 — `removeBall` calls `removeTicker(id)` (and clears physics state, kills squish + glow tweens, drops the DOM ref) for every evicted ball.

### A11. ~~`lastCollisionTimes` Map grows monotonically~~ ✅
Done alongside A12 — `removeBall(id)` now prunes all pair-key entries that reference the evicted ball id (iterates the Map and deletes any key where `key.startsWith(id + '-') || key.endsWith('-' + id)`). The ref was also moved above `removeBall` in source order so the callback can access it. Also: `lastCollisionTimes` ref was moved from its previous location at line ~711 to before `removeBall` in source order so the callback has access during eviction.

### A12. ~~`audioPool.cleanup()` is effectively a no-op~~ ✅
Done alongside A11 — removed the 30-second `setInterval(() => pool.cleanup(), 30000)` from `initializeAudio` in [src/utils/sound.ts](../src/utils/sound.ts), along with the `cleanupIntervalId` variable and its `clearInterval` in `cleanupAudio`. The `AudioNodePool.cleanup()` method itself remains (it could still be useful if called deliberately), but the dead timer is gone. This also closes one of the leaked-timer issues from B2.

### A13. `AudioContext.tsx` boilerplate — collapse to a path-based reducer
The file is ~990 lines, of which ~900 are the per-action ceremony: 30+ action types, 30+ near-identical reducer cases, 30+ action creators, 30+ context-value entries. A path-based action (`{ type: 'SET', path: ['wallSettings', 'delay', 'mix'], value: 0.5 }`) collapses the reducer to ~15 lines using an immutable `setIn` helper. Type safety is preserved with a recursive `Path<AudioState>` / `PathValue<AudioState, P>` pair (well-known pattern; ~20 lines of TS). Net: ~990 lines → ~150, all 30+ action types replaced by one. Component callsites become `set(['wallSettings','delay','mix'], v)` or a thin wrapper. Note: this is a meaningful refactor — do it alongside or after A3 (continuing the TS migration) so the JS consumers can adopt the new API at the same time.
- **Effort:** M (refactor + type plumbing + test updates)
- **Files:** [src/context/AudioContext.tsx](../src/context/AudioContext.tsx), [src/types/audio.ts](../src/types/audio.ts), [src/context/audioReducer.test.js](../src/context/audioReducer.test.js), every `*Controls.jsx` consumer

### A14. Turn on `checkJs` in tsconfig
[tsconfig.json](../tsconfig.json) has `allowJs: true, checkJs: false`, so `.js` files get zero type checking even when imported into `.ts` files. Flipping `checkJs: true` immediately surfaces type errors at the JS→TS boundary (e.g. `useAudio()`'s typed return value being passed to untyped destructuring) without waiting for the full A3 migration. Likely produces meaningful noise on first run — use `// @ts-nocheck` per-file as a temporary escape hatch and remove them as files are migrated. Lightweight experiment with high signal.
- **Effort:** XS (config) + variable (depends on error volume)
- **Files:** [tsconfig.json](../tsconfig.json), per-file escape hatches as needed

---

## 🟢 P4 — UX / Features (still open)

### 1. ~~Add a ball count cap~~ ✅
Done — cap at 50, FIFO eviction via `removeBall(oldestId)` in `spawnBallAt`. See `MAX_BALLS` in [src/components/BouncingCircles/CircleCanvas.jsx](../src/components/BouncingCircles/CircleCanvas.jsx).

### 2. Collapsible effect sections in the controls panel
The full controls panel shows ~40 controls at once. Wrap each effect (Delay, Reverb, Distortion, Tremolo) in a collapsible accordion — collapsed by default when the effect is disabled. Also add `overflow-y: auto` + `max-height` for small screens.
- **Effort:** S
- **Files:** [src/components/BouncingCircles/AudioControls/EffectControls.jsx](../src/components/BouncingCircles/AudioControls/EffectControls.jsx)

### 3. Expose tremolo waveform shape in the UI
The tremolo LFO shape (`sine`, `square`, etc.) is wired through `EffectChain.configure` (`tremolo.shape` already typed in `src/types/audio.ts`). Action type, action creator, and UI control are missing.
- **Effort:** XS–S
- **Files:** [src/context/AudioContext.tsx](../src/context/AudioContext.tsx), [src/components/BouncingCircles/AudioControls/EffectControls.jsx](../src/components/BouncingCircles/AudioControls/EffectControls.jsx)

### 4. Audio settings preset system
Allow naming and saving the current audio state as a named preset in `localStorage`, with a preset picker in the UI.
- **Effort:** M
- **Files:** [src/context/AudioContext.tsx](../src/context/AudioContext.tsx), new UI component

### 5. Custom favicon and meta tags
Ships with the default Vite favicon and no `<meta name="description">`. Add a custom favicon and Open Graph tags.
- **Effort:** XS
- **Files:** [index.html](../index.html)

### 6. Make Space-to-spawn consistent with click
Currently Space spawns at a random position; click spawns at the click point. Pick one model (center, last pointer, or random) and apply consistently.
- **Effort:** XS
- **Files:** [src/components/BouncingCircles/CircleCanvas.jsx](../src/components/BouncingCircles/CircleCanvas.jsx)

---

## Effort key

| Label | Approximate time |
|---|---|
| XS | < 1 hour |
| S | 1–4 hours |
| M | Half-day |
| L | Multi-day |
