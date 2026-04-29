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
- **P4**: Accessibility — `role="application"`, `tabIndex`, Space key spawns ball at random position, `aria-label`/`aria-valuetext` on all sliders
- **P4**: Partial TypeScript migration — `AudioContext.tsx`, `sound.ts`, `src/types/audio.ts`; `tsc --noEmit` passes with `strict: true`

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

### 3. ~~Persist settings to `localStorage`~~ ✅ Done

### 4. Expose tremolo waveform shape in the UI
The tremolo LFO shape (`sine`, `square`, etc.) is wired in `effectChains.js` but there's no action type, action creator, or UI control for it. Backend is ready — just needs wiring.
- **Effort:** XS–S
- **Files:** `src/context/AudioContext.jsx`, `src/components/BouncingCircles/AudioControls/EffectControls.jsx`

### 5. Audio settings preset system
Allow naming and saving the current audio state as a named preset in `localStorage`, with a preset picker in the UI.
- **Effort:** M
- **Files:** `src/context/AudioContext.jsx`, new UI component

### 6. ~~Accessibility: keyboard support + ARIA~~ ✅ Done

### 7. Custom favicon and meta tags
Ships with the default Vite favicon and no `<meta name="description">`. Add a custom favicon and Open Graph tags.
- **Effort:** XS
- **Files:** `index.html`

### 8. Continue TypeScript migration
`AudioContext.tsx` and `sound.ts` are typed with `strict: true`. Remaining JS components (`CircleCanvas.jsx`, shared components, hooks, utils) can be migrated incrementally. Start with `physics.js` and `spatialGrid.js` — pure functions with no DOM deps, easy to type. Then hooks, then components.
- **Effort:** M per layer (hooks: S, components: M, full: L)
- **Files:** All remaining `.js`/`.jsx` files

---

## Effort key

| Label | Approximate time |
|---|---|
| XS | < 1 hour |
| S | 1–4 hours |
| M | Half-day |
| L | Multi-day |
