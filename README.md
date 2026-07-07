# CircleLimit Studio

> Create infinite circular tessellations from prompts, images, and motion.

A browser-based creative instrument for composing original circular tessellations in
the visual language of hyperbolic geometry — Poincaré-disk compression, rotational
symmetry, and interlocking motifs that shrink toward the boundary of a perfect circle.

Everything runs locally in the browser. No images are uploaded anywhere.

## Running

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build
```

## Input modes

- **Prompt** — type a description ("black ink ravens flying in a spiral"); a local
  motif grammar maps subject nouns to procedural vector motifs (fish, bird,
  butterfly, bat, angel, flower, mask, creature, shard) drawn with woodcut-style
  outlines and interior detail lines. Deterministic per seed.
- **Image** — upload a PNG/JPG/WebP; it becomes a motif texture with contain / cover /
  silhouette fit, luminance threshold, posterize, outline, and color-preservation
  controls.
- **Sprite Sheet** — upload an animation strip or frame grid; configure rows,
  columns, margin, gap, frame range, and skip. Frames are sliced with `drawImage`
  source rectangles, optionally background-keyed, then mapped into the disk with
  seven placement modes: Sequential Ring, Radial Timeline, Spiral Motion, Symmetry
  Echo, Frame Interlock, Onion Skin Manuscript, and Zoetrope Ring — each viewable as
  a static motion map or animated with the playback bar (speed, loop, ping-pong,
  scrubbing).

## Geometry

Rings sit at equal hyperbolic steps mapped to disk radius via `r = tanh(h / 2)`;
motif scale follows `1 − r²`, so per-ring counts grow and forms shrink toward visual
infinity at the boundary. Controls: symmetry order (3–16), rings, density,
edge compression, motif scale, spiral offset, center void, rotation aim, mirror
alternation, and geodesic guides. A true `{p, q}` reflection-tiling engine is the
planned Phase 2 upgrade behind the same `Placement[]` interface.

## Style presets

Ink Limit, Antique Circle, Stained Glass Swarm, Creature Geometry, Minimal
Hyperbolic, Bone + Obsidian, Red/Black Alchemy.

## Export

PNG, transparent PNG, animated GIF (looping, encoded locally with gifenc),
video (MP4 where the browser's MediaRecorder supports H.264, WebM otherwise;
records in real time — keep the tab visible), PNG sequence, and settings JSON
export/import. SVG export is Phase 2.

## Architecture

```
src/
  geometry/    poincare.ts (disk mapping) · placements.ts (tessellation engine) · geodesics.ts
  motifs/      motifTypes.ts · proceduralMotifs.ts · promptMotifAdapter.ts · imageMotifAdapter.ts
  sprites/     sliceSpriteSheet.ts · spriteMapping.ts
  render/      canvasRenderer.ts (pure scene → canvas)
  export/      exportPNG.ts · exportAnimation.ts · exportSVG.ts (Phase 2 stub)
  state/       useStudioState.ts (settings, quality caps, JSON import/export)
  styles/      presets.ts
  components/  three-panel studio UI
```

Motif variants are pre-rendered to offscreen canvases per palette color; the render
loop is pure `drawImage` stamping. Placements are memoized on geometry settings and
capped by quality mode (Draft / Balanced / High / Poster).

See [PLAN.md](PLAN.md) for the full product plan, algorithms, and Phase 2 roadmap.

## Legal note

CircleLimit Studio is inspired by the mathematics of hyperbolic tessellation. It
does not include, reproduce, trace, or generate replicas of any M.C. Escher artwork,
which remains under copyright. Outputs are original works.
