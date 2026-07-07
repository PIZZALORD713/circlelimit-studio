# CircleLimit Studio — Build Plan

> Create infinite circular tessellations from prompts, images, and motion.

This document is the architect-level plan (sections 1–12 required by the product brief).
The implementation in this repo is the MVP described in section 9.

## 1. Product summary

CircleLimit Studio is a browser-based creative instrument for composing original
circular tessellations in the visual language of hyperbolic geometry (Poincaré-disk
compression, rotational symmetry, interlocking motifs shrinking toward a circular
boundary). Three input modes feed one geometry engine:

1. **Prompt Mode** — a local motif grammar maps subject nouns to procedural vector
   motifs (fish, bird, butterfly, bat, angel, flower, mask, creature, shard).
2. **Image Mode** — a locally-loaded image becomes a motif texture, optionally
   thresholded to a silhouette, posterized, and outlined. Nothing is uploaded.
3. **Sprite Sheet Mode** — an animation strip/grid is sliced into frames and mapped
   into the disk via seven placement modes, with live animation playback.

Everything renders inside a clipped circle; motif scale follows `1 - r²` so the
composition approaches visual infinity at the boundary.

**Legal guardrail:** no Escher artwork is bundled, scraped, traced, or reproduced.
Only the underlying geometric principles are used. The UI carries a note to that effect.

## 2. UX plan

Three-panel studio layout on a dark gallery background:

- **Left — Inputs & Controls:** mode tabs (Prompt / Image / Sprite Sheet), per-mode
  input panel, seed + regenerate, style presets, geometry controls, sprite controls,
  export controls.
- **Center — Circle Canvas:** large clipped disk, live updates, zoom (wheel) and pan
  (drag), optional geodesic guides, playback bar in sprite mode.
- **Right — Inspector:** motif/frame preview, current settings readout, generation
  notes, reference/legal notes.

Microcopy on long operations: "Approaching infinity…", "Extracting motif…",
"Mapping frames into disk…". Reduced-motion users get animation paused by default.
All controls are labeled and keyboard-accessible with visible focus states.

## 3. Technical architecture

- **Stack:** React 19 + TypeScript + Vite. No server; all processing is local.
- **Rendering:** Canvas 2D for the live disk, uploaded images, sprite frames,
  animation, and raster export. Procedural motifs are drawn with canvas path
  primitives and pre-rendered per palette color to offscreen canvases; mirroring is a
  draw-time `scale(-1, 1)`. Circular clipping via `ctx.clip()`.
- **Determinism:** all placement and motif variation flows from a string seed
  (FNV-1a hash → mulberry32 PRNG).
- **Performance:** placements memoized on geometry settings; motif variants
  pre-rendered on (motif, preset) change; `requestAnimationFrame` only while playing;
  quality modes (Draft/Balanced/High/Poster) cap placement counts and export size.
- **Adapters:** `MotifGeneratorAdapter` interface with a local procedural
  implementation, so a future AI backend slots in without touching the renderer.

## 4. Component map

```
App (state owner, toast, layout)
├── TopBar (title, quality select, seed)
├── Left panel
│   ├── InputModeTabs
│   ├── PromptInputPanel | ImageUploadPanel | SpriteSheetUploadPanel
│   ├── SpriteControls (sprite mode)
│   ├── GeometryControls
│   ├── StyleControls
│   └── ExportControls
├── Center
│   ├── CircleLimitCanvas (render loop, zoom/pan)
│   └── PlaybackBar (sprite mode)
└── InspectorPanel (motif preview, settings readout, notes)
```

## 5. Data model

Key types (see `src/state/useStudioState.ts`, `src/geometry/placements.ts`):
`StudioSettings`, `ImageMotifOptions`, `SpriteSheetConfig`, `AnimationSettings`,
`Placement { ringIndex, wedgeIndex, wedgeCount, x, y, radius, theta, scale, rotation,
mirrored, opacity, paletteIndex }`, `MotifFamily`, `StylePreset`, `SpritePlacementMode`.

## 6. Geometry algorithm plan (MVP approximation)

Normalized disk coordinates in [-1, 1], radius mapped from hyperbolic distance:

- Ring i sits at `r = tanh((h0 + (i+1)·step·edgeCompression) / 2)` where
  `h0 = 2·atanh(centerVoid)`.
- Motif scale: `scale = baseScale · motifScale · max(minScale, 1 - r²)`.
- Per-ring count: `round(2πr / (scale·spacing/density))` snapped to a multiple of the
  symmetry order, so wedge symmetry is always exact.
- Odd rings get a half-step angular stagger for interlocking; `spiralOffset` adds a
  per-ring twist; `mirrorAlternates` flips odd wedges; rotation mode aims motifs
  tangent / toward center / outward.
- Guides: ring circles + symmetry diameters + orthogonal-arc approximations.

**Phase 2 (true {p,q} tiling):** reflection-based fundamental-region expansion with
deduplication and depth cutoff, per Dunham's algorithm; the `Placement[]` contract is
unchanged, so the renderer needs no changes.

## 7. Sprite sheet algorithm plan

Slicing: `drawImage` source rectangles from rows/columns/margin/gap config (frame
size auto-derived when zero); optional background keying samples the sheet corner
color and clears matching pixels (tolerance-based) when the sheet has no alpha.

Placement modes map `(ringIndex, wedgeIndex, wedgeCount)` → base frame index:
sequential-ring, radial-timeline, spiral-motion, symmetry-echo, frame-interlock,
onion-skin (sequential + fading trails at render time), zoetrope-ring. Animation adds
a global time-driven offset (loop or ping-pong triangle wave) so every mode animates.

## 8. Export plan

- PNG and transparent PNG via offscreen render + `canvas.toBlob`.
- JSON settings export/import (geometry, style, sprite config, animation; images are
  not embedded — noted in UI).
- PNG sequence export for animation (one file per frame).
- SVG, GIF, WebM: Phase 2 (stubs and UI notes in place).

## 9. MVP implementation phases

1. Scaffold + layout + state model. 2. Geometry engine. 3. Procedural motifs +
prompt grammar. 4. Image mode. 5. Sprite sheet mode + playback. 6. Export. 7. Polish
(presets, a11y, README, clean build).

## 10. Implementation task list

Tracked as the phase list above; each phase maps to the modules in `src/` listed in
the README architecture section.

## 11. Acceptance criteria

Mirrors the brief: prompt → original tessellation; image repeats in disk; sprite
sheet slices and distributes; static motion map + animated preview; live controls;
perfect circular clipping; edge shrink; PNG export; `tsc` clean build; no Escher
assets anywhere in the repo.

## 12. Risks & fallbacks

- **True hyperbolic tiling is hard** → MVP ships the ring approximation behind the
  same `Placement[]` interface.
- **GIF/WebM encoding weight** → PNG sequence now, encoders in Phase 2.
- **AI generation unavailable** → local procedural adapter behind
  `MotifGeneratorAdapter`.
- **Dense renders janking the UI** → quality caps + memoized placements +
  pre-rendered motif canvases.
- **Sprite sheets with opaque backgrounds** → corner-sample chroma keying with
  adjustable tolerance.
