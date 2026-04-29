# Oscillaphone — Codebase Review

*Reviewed April 2026 (third deep pass)*

---

## What changed since the second pass

The second-pass review (early April 2026) drove three rounds of refactor work. Most of it landed:

- **TypeScript migration (partial)** — `src/utils/sound.ts`, `src/context/AudioContext.tsx`, and `src/types/audio.ts` are now typed with `strict: true`; `tsc --noEmit` is clean.
- **Dual-state collapse** — every audio parameter now lives in React state and is passed as a `SoundSettings` argument into `playWallCollisionBeep` / `playCollisionBeep`. Only `currentScale` and the `globalMaster.gain` Web Audio param remain as module-level state in `sound.ts`.
- **EffectChain fully wired** — reverb (now a `ConvolverNode` with a synthesized impulse-response, replacing the old comb-filter network), distortion, tremolo, and delay are all live in `createOptimizedBeep`. The "fallback to basic sound" branch only triggers when the 8-chain pool is exhausted.
- **`createOriginalBeep` removed** — `createOptimizedBeep` is the sole playback path. A `_tombstone` arrow remains as a `git blame` marker (see [Code quality](#-code-quality) for the recommendation to remove it).
- **Dead code purge** — the 1,801-line monolithic `BouncingCircles.jsx`, `AnimatedHero`, `NavBar`, `ScrollSection`, `MainLayout`, `animations.js`, `GlobalVolumeControl.jsx`, and the empty `contexts/` directory are gone.
- **Pure-math HSL→RGBA**, color-cache size cap (200), `generateGradient` dedup, PropTypes on every component, `import React` removal — all complete.
- **Vitest tests** — 50 tests across `physics.js`, `spatialGrid.js`, `audioReducer`.
- **P4 features shipped** — three additional scales (A Pent Min, C Pent Maj, D Dorian) with note groups derived dynamically; `localStorage` persistence with deep-merged loading; `role="application"`, `tabIndex`, Space-to-spawn, ARIA on all sliders; `onPointerDown` for touch/stylus.

`npm run lint` reports **2 errors and 4 warnings** (see Bug B4 below). `npm test` is **50/50 passing**. `tsc --noEmit` is clean.

The first- and second-pass review documents have been superseded by this one.

---

## High-level state

| Layer | Status |
|---|---|
| Physics | ✅ Clean — pure functions, spatial grid, well-tested |
| Audio graph | ✅ Single playback path; all four effects wired; ConvolverNode reverb |
| State management | ✅ Single source of truth in React reducer; refs mirror state for closures |
| Persistence | ⚠️ Works, but writes to `localStorage` on every dispatch (no debounce) |
| Type safety | ⚠️ Audio core typed; every consumer is still JS — boundary leaks `any` |
| Tests | ⚠️ Pure-logic islands covered; effect chain, hooks, persistence uncovered |
| Lint | ⚠️ 2 errors / 4 warnings — `@typescript-eslint` plugin not loaded (Bug B4) |
| CI | ⚠️ Build-only; no lint / test / type-check gate before deploy |
| A11y / mobile | ✅ Pointer events, role + label, keyboard spawn |

---

## Source inventory (active code)

| Path | Lang | Role |
|---|---|---|
| [src/App.jsx](../src/App.jsx) | jsx | Renders `BouncingCircles` |
| [src/main.jsx](../src/main.jsx) | jsx | Entry point |
| [src/components/BouncingCircles/index.jsx](../src/components/BouncingCircles/index.jsx) | jsx | Shell, controls toggle, ball-speed state |
| [src/components/BouncingCircles/CircleCanvas.jsx](../src/components/BouncingCircles/CircleCanvas.jsx) | jsx | Physics ticker, rendering, collision events (~830 lines) |
| [src/components/BouncingCircles/ScaleSelector.jsx](../src/components/BouncingCircles/ScaleSelector.jsx) | jsx | Musical scale picker |
| [src/components/BouncingCircles/AudioControls/index.jsx](../src/components/BouncingCircles/AudioControls/index.jsx) | jsx | Tab switcher |
| [src/components/BouncingCircles/AudioControls/WallControls.jsx](../src/components/BouncingCircles/AudioControls/WallControls.jsx) | jsx | Wall-sound wiring |
| [src/components/BouncingCircles/AudioControls/CircleControls.jsx](../src/components/BouncingCircles/AudioControls/CircleControls.jsx) | jsx | Circle-sound wiring |
| [src/components/BouncingCircles/AudioControls/EffectControls.jsx](../src/components/BouncingCircles/AudioControls/EffectControls.jsx) | jsx | Shared per-effect UI |
| [src/components/BouncingCircles/AudioControls/GlobalControls.jsx](../src/components/BouncingCircles/AudioControls/GlobalControls.jsx) | jsx | Master volume + ball speed |
| [src/components/shared/Button.jsx](../src/components/shared/Button.jsx) | jsx | `forwardRef` button with GSAP hover |
| [src/components/shared/Slider.jsx](../src/components/shared/Slider.jsx) | jsx | Range input + ARIA |
| [src/components/shared/Checkbox.jsx](../src/components/shared/Checkbox.jsx) | jsx | |
| [src/components/shared/ControlPanel.jsx](../src/components/shared/ControlPanel.jsx) | jsx | |
| [src/context/AudioContext.tsx](../src/context/AudioContext.tsx) | tsx | Reducer, persistence, action creators (~990 lines) |
| [src/context/audioReducer.test.js](../src/context/audioReducer.test.js) | js | Reducer unit tests |
| [src/types/audio.ts](../src/types/audio.ts) | ts | `SoundSettings`, `AudioState`, `AudioAction` types |
| [src/hooks/useAnimationState.js](../src/hooks/useAnimationState.js) | js | GSAP timeline + ticker management |
| [src/hooks/useCollisions.js](../src/hooks/useCollisions.js) | js | Physics state + spatial grid |
| [src/hooks/useColorPalette.js](../src/hooks/useColorPalette.js) | js | Color generation + gradient |
| [src/hooks/useGSAP.js](../src/hooks/useGSAP.js) | js | Thin GSAP context wrapper |
| [src/utils/sound.ts](../src/utils/sound.ts) | ts | Web Audio init, scales, `createOptimizedBeep` (~620 lines) |
| [src/utils/effectChains.js](../src/utils/effectChains.js) | js | `EffectChain` class + 8-chain pool |
| [src/utils/audioPool.js](../src/utils/audioPool.js) | js | Pre-allocated `AudioNode` pool |
| [src/utils/physics.js](../src/utils/physics.js) | js | Elastic collision math |
| [src/utils/physics.test.js](../src/utils/physics.test.js) | js | Tests |
| [src/utils/spatialGrid.js](../src/utils/spatialGrid.js) | js | Hash-grid for O(n) collision queries |
| [src/utils/spatialGrid.test.js](../src/utils/spatialGrid.test.js) | js | Tests |

---

## Gaps and Issues

### 🔴 Bugs / Runtime Errors

**1. Distortion `oversample` setting is silently a no-op.**
The UI control, `SET_*_DISTORTION_OVERSAMPLE` action types, reducer cases, default state value (`'2x'`), and `localStorage` persistence are all in place. The value is never applied to the WaveShaperNode: [src/utils/effectChains.js](../src/utils/effectChains.js) `EffectChain.configure()`'s distortion block sets `curve`, `distortionDry`, and `distortionMix` but never assigns `n.distortion.oversample`. To make matters worse, [src/utils/audioPool.js](../src/utils/audioPool.js#L141) `resetNode` always sets `oversample = 'none'` when a waveshaper is checked back out of the pool. This is the same shape of bug as the original P1 oversample fix — it just moved one layer down with the EffectChain wiring.

**2. `cleanupAudio()` is never invoked.**
[src/context/AudioContext.tsx](../src/context/AudioContext.tsx) calls `initAudioContext()` in the mount `useEffect` but returns no cleanup. On Vite HMR, on `AudioProvider` unmount, and on full SPA teardown, the audio context, the 30-second `setInterval`, and the pre-allocated pools are never released. Production impact is small (the provider lives for the page lifetime), but dev-mode HMR steadily accumulates intervals and pooled nodes.

**3. No `audioContext.resume()` after first user gesture.**
[src/utils/sound.ts](../src/utils/sound.ts) `initAudioContext` constructs the context but never calls `.resume()`. iOS Safari (and some Android browsers) keep newly-created contexts in `suspended` state until an explicit resume is fired from a user gesture. The first click currently constructs the context but may not actually start audio output on those browsers.

**4. Lint is broken: `@typescript-eslint/no-non-null-assertion` rule is not loaded.**
Two `eslint-disable-next-line @typescript-eslint/no-non-null-assertion` comments in [src/utils/sound.ts](../src/utils/sound.ts) (lines ~295, ~316) reference a rule that isn't registered — [eslint.config.js](../eslint.config.js) only imports `@typescript-eslint/parser`, not the `@typescript-eslint` plugin. ESLint flags both as `Definition for rule '@typescript-eslint/no-non-null-assertion' was not found`, producing **2 errors**. There are also **4 warnings**: one `react-hooks/exhaustive-deps` in `CircleCanvas.jsx` (line 788) and three `react-refresh/only-export-components` in `AudioContext.tsx` (the test-only exports of `audioReducer`, `initialState`, `ActionTypes`). Either install the plugin and wire it into the TS overrides, or remove the disables and the corresponding non-null assertions.

---

### 🟠 Architecture / Design Problems

**4. TypeScript migration is partial; the value boundary leaks `any`.**
`AudioContext.tsx`, `sound.ts`, and `types/audio.ts` are typed with `strict: true`. Every consumer — `CircleCanvas.jsx`, all `AudioControls/*.jsx`, all `shared/*.jsx`, all hooks — is still JavaScript. `useAudio()` returns a fully-typed `AudioContextValue`, but JS callers observe it as `any`, which removes most of the migration's safety value. The next concentric layer to migrate (in dependency order):
- `src/utils/physics.js`, `src/utils/spatialGrid.js` (pure, no DOM)
- `src/hooks/useCollisions.js`, `useColorPalette.js`, `useAnimationState.js`
- `src/components/shared/*.jsx` (small, leaf)
- `src/components/BouncingCircles/AudioControls/*.jsx`
- `CircleCanvas.jsx`, `BouncingCircles/index.jsx` (last)

**5. `localStorage` is written on every reducer dispatch.**
[src/context/AudioContext.tsx](../src/context/AudioContext.tsx) (~line 644) runs `JSON.stringify(state); localStorage.setItem(...)` inside a `useEffect` with `[state]`. While the user drags a slider this fires at the React render rate (~60 Hz). Should be debounced (~250 ms) or written on `pointerup`.

**6. Deploy workflow has no quality gate.**
[.github/workflows/deploy.yml](../.github/workflows/deploy.yml) runs `npm ci && npm run build` and ships. It does not run `npm run lint`, `npm test`, or `tsc --noEmit`. The current "0 errors" baseline is honour-system. The workflow targets `main`, while the working branch is `dev_branch` — confirm intent.

**7. Five exports in `sound.ts` are unused.**
`cleanupNodes`, `cleanup`, `getGlobalVolume`, `playBeep`, and the `_tombstone` arrow (with `void _tombstone`) have no callers anywhere. The tombstone is especially noisy — a one-line comment is enough.

**8. ESLint config still says `react: { version: '18.3' }`.**
[eslint.config.js](../eslint.config.js) declares the React version explicitly while `package.json` has React 19. This can produce subtly stale rule behavior (especially around new hooks/refs semantics). Set to `'detect'` or `'19'`.

**9. Two `eslint-disable @typescript-eslint/no-non-null-assertion` in `sound.ts`** (lines ~295, ~316). Both immediately follow `initAudioContext()`, which guarantees non-null. With the plugin missing (Bug B4), these disables are themselves what's causing the lint errors. Either install `@typescript-eslint/eslint-plugin` and wire it into the TS overrides, or extract an `assertContext()` helper / return the context from `initAudioContext` and drop the assertions entirely.

**10. `removeCircleFromRender` in CircleCanvas is dead code under `eslint-disable`.**
[src/components/BouncingCircles/CircleCanvas.jsx](../src/components/BouncingCircles/CircleCanvas.jsx#L323) — defined and disabled, waiting for a ball-cap implementation (see UX section). Either implement the cap or remove the helper.

**11. GSAP per-ball tickers are added but never removed.**
[src/hooks/useAnimationState.js](../src/hooks/useAnimationState.js) exports `removeTicker`; nothing in `CircleCanvas.jsx` calls it. Each ball's ticker callback runs every frame for the page lifetime, even if balls become invisible or are conceptually "gone." Closures retain DOM refs, GSAP state, and per-ball collision tracking objects. Unmount cleanup catches them but normal play does not. (BACKLOG A10.)

**12. `lastCollisionTimes` Map grows monotonically.**
[src/components/BouncingCircles/CircleCanvas.jsx](../src/components/BouncingCircles/CircleCanvas.jsx#L711) accumulates a `pairKey → timestamp` entry for every ball-pair that has ever collided. Entries are never pruned, so the Map grows to O(N²). Becomes acute once a ball cap exists and balls are removed — their pair entries linger. (BACKLOG A11.)

**13. `audioPool.cleanup()` is effectively a no-op.**
The 30-second interval started by [src/utils/sound.ts](../src/utils/sound.ts) `initAudioContext` only removes nodes whose `context.state === 'closed'`. That state only happens during full audio-context teardown, at which point the pool is destroyed anyway. The interval does nothing in normal operation but contributes to B2's leak surface. (BACKLOG A12.)

**14. `AudioContext.tsx` is ~95% boilerplate.**
Of ~990 lines, ~900 are per-action ceremony: 30+ action types, 30+ reducer cases, 30+ action creators, 30+ context-value entries. A path-based action (`{ type: 'SET', path: [...], value }`) plus a `Path<T>` / `PathValue<T,P>` recursive type collapses this to ~150 lines while preserving type safety. (BACKLOG A13.)

**15. `tsconfig` has `checkJs: false`.**
[tsconfig.json](../tsconfig.json) lets `.js` files import typed `.ts` modules with no type checking at the boundary, defeating most of the partial-migration's value. Flipping `checkJs: true` (with `// @ts-nocheck` escape hatches) surfaces real errors immediately. (BACKLOG A14.)

---

### 🟡 Test coverage gaps

**11. `effectChains.js` is the largest piece of net-new logic and is entirely untested.**
The IR cache, signal-graph wiring, `configure()` (especially the LFO lifecycle), `deactivate`/`reset`, and the pool overflow path could all be covered by mocking `AudioContext` (or extracting the IR-cache key logic). Skipping the whole file is a defensible call given the Web Audio API's hostility to mocking — but the cache key, the impulse-response math, and the "pool overflow creates a new chain" edge case are pure logic and worth testing.

**12. Hooks and persistence are uncovered.**
`useCollisions`'s collision-event payload shape, `loadPersistedState`'s deep-merge behavior (especially for older saved blobs missing new effect keys), and `useColorPalette`'s gradient math have no tests.

---

### 🟡 Code quality / housekeeping

**13. `.DS_Store` is in the repo root** — add to `.gitignore`.

**14. Documentation drift** — see [Stale claims in earlier docs](#stale-claims-in-earlier-docs) below. This rewrite supersedes the earlier passes.

---

### 🟡 UX / Feature Gaps (still open)

**15. Ball count cap** — no upper bound on spawning. With 50+ balls the physics loop bogs down. The `removeCircleFromRender` helper is already in place for this. (P4-1)

**16. Collapsible effect sections + overflow scroll on the controls panel.** Today all four effects are rendered fully expanded for both wall and ball settings — ~40 controls visible at once. (P4-2)

**17. Tremolo waveform shape is plumbed end-to-end except for the UI.** [src/utils/effectChains.js](../src/utils/effectChains.js) `configure()` accepts `tremolo.shape` and falls back to `'sine'` ([src/utils/sound.ts](../src/utils/sound.ts#L370) passes it through). There's no action type, action creator, or UI control. (P4-3)

**18. Space-to-spawn places the ball at a random position**, while click spawns at the click point ([CircleCanvas.jsx](../src/components/BouncingCircles/CircleCanvas.jsx) `handleKeyDown`). Inconsistent — pick one (center, last pointer, or random) and apply consistently.

**19. Custom favicon and meta tags** — still ships with the default Vite favicon. (P4-5)

**20. Preset system** for named audio configurations (still backlog). (P4-4)

---

## Stale claims in earlier docs

The following items in the second-pass review/backlog and `.claude/CLAUDE.md` are now obsolete or contradicted by code:

| Stale claim | Current reality |
|---|---|
| `sound.js` is 453 lines | It's now `sound.ts`, ~620 lines (TS overhead + per-octave scale data) |
| `AudioContext.jsx` ~918 lines | It's now `AudioContext.tsx` ~990 lines |
| `generateGradient` is duplicated | Deduped — both consumers import from `useColorPalette` |
| `createOriginalBeep` / `createOptimizedBeep` coexist | Only `createOptimizedBeep` remains; tombstone arrow noted above |
| Dead files (`BouncingCircles.jsx` monolith, `AnimatedHero`, `NavBar`, etc.) | All deleted |
| Reverb is a comb-filter network | Now `ConvolverNode` with synthesized stereo IR + IR cache |
| Tremolo / distortion / reverb are unwired stubs in `effectChains.js` | All wired and configured |
| `colorCache` grows without bound | Capped at 200 with FIFO eviction |
| 225 lint errors / 11 warnings | 2 errors / 4 warnings (see Bug B4 — was 0/0 until the TS-eslint plugin gap surfaced) |
| No tests | 50 tests across physics, spatial grid, reducer |
| README understates feature set | Updated; lists all four effects, scales, touch support |
| Pending `setWallDistortionOversample` action type | Action types exist; the value just isn't applied to the node (see Bug 1) |
| "P4-22 through P4-29: TBD" | Removed; current backlog is items 1–6 in BACKLOG.md |

Items still accurate from earlier passes: the bug-history lessons (`ReferenceError` killing the rAF loop; settings-ref pattern), the architecture overview, the GSAP cleanup discipline.

---

## Opportunities for Improvement

Roughly impact-to-effort ordered.

### Quick wins
1. **Fix the oversample no-op** — set `n.distortion.oversample = settings.distortion.oversample` in `EffectChain.configure()` (and stop forcing `'none'` in `audioPool.resetNode`). 5 minutes.
2. **Remove dead exports + tombstone in `sound.ts`** — straight deletion. 5 minutes.
3. **Add `.DS_Store` to `.gitignore`**.
4. **Update ESLint react version** to `'detect'` or `'19'`.
5. **Add `audioContext.resume()`** in `initAudioContext` (after construction) to fix iOS Safari. 5 minutes.
6. **Add `cleanupAudio()` cleanup return** to the `AudioProvider` mount effect.
7. **Make Space-to-spawn consistent** with click (center or last pointer).

### Medium investment
8. **Debounce `localStorage` writes** (~250 ms) or write on `pointerup`.
9. **Add lint + test + `tsc --noEmit` to the deploy workflow** as a build-time gate.
10. **Ball count cap (P4-1)** — wire up the orphan `removeCircleFromRender`.
11. **Collapsible effect sections + overflow scroll (P4-2)**.
12. **Expose tremolo waveform in the UI (P4-3)**.

### Larger investments
13. **Continue TS migration outward** — pure utils → hooks → shared → control components → CircleCanvas.
14. **Targeted `effectChains.js` tests** — cover the IR-cache key, the impulse-response shape, and the pool overflow path with a thin `AudioContext` mock.
15. **Preset system (P4-4)** — named save/load of audio configurations.
16. **Custom favicon + Open Graph tags (P4-5)**.

---

## File-by-File Health Summary

| File | Health | Notes |
|---|---|---|
| `src/utils/physics.js` | ✅ | Pure, tested |
| `src/utils/spatialGrid.js` | ✅ | Pure, tested |
| `src/utils/audioPool.js` | ⚠️ | Sound architecture; `resetNode` clobbers `waveshaper.oversample` (root of Bug 1) |
| `src/utils/effectChains.js` | ⚠️ | Wiring + IR cache solid; oversample never set; zero test coverage |
| `src/utils/sound.ts` | ⚠️ | Single playback path; 5 dead exports + tombstone; no `resume()` |
| `src/context/AudioContext.tsx` | ⚠️ | Clean reducer; persists too eagerly; no provider cleanup |
| `src/types/audio.ts` | ✅ | Discriminated-union action type; matches reducer |
| `src/hooks/useCollisions.js` | ✅ | Clear, integrated with grid; untested |
| `src/hooks/useAnimationState.js` | ✅ | |
| `src/hooks/useColorPalette.js` | ✅ | Single source for `generateGradient` |
| `src/components/BouncingCircles/CircleCanvas.jsx` | ⚠️ | 830 lines; `removeCircleFromRender` dead; settings-ref pattern correct |
| `src/components/BouncingCircles/index.jsx` | ✅ | |
| `src/components/BouncingCircles/AudioControls/*` | ✅ | Thin, composable; PropTypes everywhere |
| `src/components/shared/*` | ✅ | |
| `.github/workflows/deploy.yml` | ⚠️ | No lint/test/tsc gate |
| `eslint.config.js` | ⚠️ | React version pinned to 18.3 |
