# CircleLimit Studio — Phase 2 Proposal

> Phase 1 built a creative engine. Phase 2 makes it an **instrument**: every
> scene is a living, shareable, remixable, agent-drivable object — and the
> geometry underneath becomes mathematically true.

This document is the Phase 2 plan. It builds on [PLAN.md](PLAN.md) (the Phase 1
architecture) and assumes the MVP as shipped: three input modes, ring-based
tessellation with a correct Möbius lens, seven sprite choreographies, working
PNG / transparent PNG / GIF / WebM-MP4 / PNG-sequence export, and the
programmatic control surface (`window.circleLimit` + postMessage, documented in
[docs/AI-API.md](docs/AI-API.md)).

---

## 1. Thesis

**CircleLimit Studio becomes an agent-drivable hyperbolic animation
instrument: users and AIs create, remix, share, and export living circular
tessellations from prompts, images, sprites, and recipes — and every scene is
a URL.**

Phase 1's architecture already points here. Every pixel is a pure function of
four small serializable state objects plus a bitmap; the control schema
describes every knob in machine-readable form; the bridge lets any program
drive the studio and read frames back. Phase 2 is mostly about **exposing that
magic** — plus one deep upgrade (true `{p, q}` tiling) that makes the project
mathematically serious rather than visually inspired.

## 2. The unifying idea: `Scene` as a first-class object

Three of the headline features — shareable URLs, a recipe gallery, and a
showcase page — are the *same feature* wearing different clothes. All of them
need a compact, versioned, serializable description of "everything about what's
on screen." Natural-language control needs the same thing as its *output*
format. So Phase 2 starts by making that object real:

```ts
/** A complete, portable description of what's on screen. */
interface Scene {
  v: 2;                              // format version
  patch: Record<string, unknown>;    // flat controls, ONLY non-default keys
  demo?: string;                     // bundled demo-sheet id, if sprite mode
}
```

Design decisions that matter:

- **Diff-against-defaults.** Only keys that differ from `DEFAULT_*` are stored.
  URLs stay short, and old links keep working when defaults evolve.
- **Applied through the existing patch router.** Loading a scene is literally
  `patch(scene.patch)` — every value flows through `coerceValue()`, so clamping,
  validation, and forward-compatible unknown-key skipping come for free. No new
  validation surface.
- **Assets by reference, never by value.** State JSON already excludes bitmaps
  (deliberately — privacy and size). A scene may name a *bundled* demo sheet;
  it never embeds an upload. A shared scene built on an upload reproduces every
  setting and shows a "drop your image to complete this scene" notice. This is
  an honest constraint, and it shapes the recipe strategy (§4): launch recipes
  are built exclusively from prompt motifs and bundled demo sheets, so they
  reproduce *exactly* everywhere.

Everything else in Phase 2 consumes this object.

## 3. Workstream A — Shareable scene URLs

*The address bar becomes the save file.*

- **Encoding:** `Scene` → JSON → deflate (native `CompressionStream`) →
  base64url → `/#s=<blob>`. Fallback to uncompressed base64url where
  `CompressionStream` is unavailable. Typical scenes are a handful of changed
  keys — well under 200 characters.
- **Live hash:** the hash updates (debounced, `history.replaceState`) as the
  user edits, so *every* moment of play is copyable. Plus an explicit
  **Copy scene link** button with a toast.
- **Load path:** on boot, parse `#s=`, apply via the patch router, load the
  referenced demo sheet if any. Malformed hashes fail silently to defaults.
- **Bridge additions:** `getScene()`, `loadScene(sceneOrUrl)`, `getSceneURL()`
  — an agent can now mint and consume share links.
- **Determinism guarantee:** seed + settings already fully determine the image
  (FNV-1a → mulberry32), so a link is a *pixel-exact* reproduction, including
  animation choreography.

New module: `src/scenes/sceneCodec.ts` (~120 lines). No new dependencies.

## 4. Workstream B — Scene recipes & remix gallery

*The fastest path from "tool the creator understands" to "instrument anyone
can play."*

- **`src/scenes/recipes.ts`:** ~10 named, art-directed `Scene`s spanning all
  three modes, e.g.:
  - **Raven Spiral** — prompt mode, ink-limit, strong `spiralOffset`, tangent aim
  - **Infernal Bats** — prompt mode, red-black-alchemy, mirror alternates
  - **Stained Glass Swarm** — prompt butterflies, jewel palette, high density
  - **Zoetrope Murmuration** — bundled starling sheet, zoetrope-ring, playing
  - **Onion-Skin Manuscript** — starling flight, onion trails, bone + obsidian
  - **Geodesic Study** — guides on, minimal-hyperbolic, sparse density
  - **Lens Distortion** — high `lensStrength`, off-axis focus, poster quality
- **Reproducibility by construction:** recipes only reference prompt motifs and
  bundled demo sheets (§2), so they render identically on every machine.
- **UI:** a recipe strip (drawer on mobile) with thumbnails. Thumbnails are
  rendered *by the engine itself* at first paint — deterministic seeds mean no
  bundled preview images, no drift between thumbnail and result.
- **Remix loop:** loading a recipe seeds the live URL (§3); every subsequent
  tweak updates it. Recipe → tweak → copy link → share **is** the remix
  culture, with zero server.
- **Bridge additions:** `listRecipes()`, `loadRecipe(id)` — agents get a
  palette of curated starting points instead of a cold parameter space.

## 5. Workstream C — Natural-language studio control

*The signature feature — typed phrases become settings patches.*

The bridge contract in AI-API.md was designed for exactly this. The key
Phase 2 decision is **tiering**, because "everything runs locally, nothing is
uploaded" is a brand pillar we will not silently break:

- **Tier 1 — Local phrase grammar (ships first, works offline).**
  `src/engine/nlPatch.ts`: a deterministic lexicon mapping adjectives and verbs
  to *relative* control operations —
  `"denser"` → `density × 1.25`, `"more spiraled"` → `spiralOffset ± 0.08`,
  `"stained glass"` → `stylePreset: stained-glass-swarm`,
  `"stronger lens"` → `lensStrength + 0.15`, `"calmer"` → fps down + spiral
  toward 0, `"reverse"` → `direction` flip, plus subject nouns routed to the
  existing prompt grammar. Relative ops (nudge from current value, clamp via
  `coerceValue`) mean the same word always "does something" regardless of
  current state. Same philosophy as `promptMotifAdapter`: deterministic, local,
  instant. So `make it denser, more spiraled, stained-glass, with a stronger
  lens` works with no network and no key.
- **Tier 2 — BYOK LLM (opt-in).** Paste an API key (stored in
  `localStorage`, never sent anywhere but the provider). The system prompt is
  literally `describeControls()` — already written for LLM consumption; the
  model returns `{ key: value }` JSON that flows through `patch()`. Handles
  compound, referential, and creative requests the lexicon can't
  ("make it feel like a cathedral at night").
- **Tier 3 — External agents (already shipped, document it).** The postMessage
  transport means a parent page, extension, or orchestrator with vision can
  drive the studio in a see → patch → see loop today. Phase 2 adds a worked
  example under `docs/` and a demo clip.
- **UI:** a command bar (`⌘K` / `/`). After each phrase, the applied patch is
  shown as **chips** (`density 1.5 → 1.9`, `stylePreset → stained-glass-swarm`)
  — the NL bar doubles as a teaching tool for the manual controls, and makes
  Tier 1's limits legible instead of mysterious.

## 6. Workstream D — True `{p, q}` hyperbolic tiling engine

*The deep track: from "visually inspired" to "mathematically true."*

Already sketched in PLAN.md §6; Phase 2 builds it.

- **Algorithm (Dunham-style):** construct the fundamental triangle of the
  `{p, q}` symmetry group (valid hyperbolic when `(p−2)(q−2) > 4`); expand by
  reflecting across geodesic edges, breadth-first by generation; deduplicate
  via quantized tile-center hashing; stop at a depth cutoff and the existing
  `maxPlacements` quality caps.
- **Foundations already in place:** `mobiusTranslate` in `poincare.ts` is a
  correct disk isometry with conformal scale/rotation derivatives — the exact
  primitive needed to position tiles; `geodesics.ts` already draws orthogonal
  arcs; the lens composes cleanly with true tilings because it *is* an isometry.
- **One honest correction to the "no renderer changes" claim:** the
  `Placement[]` *shape* is unchanged, but the sprite choreography
  (`spriteMapping.effectiveFrameIndex`) consumes ring/wedge *semantics* —
  `ringIndex`, `wedgeIndex`, `wedgeCount`. The tiling engine therefore
  synthesizes them: generation depth → `ringIndex`, index-within-generation →
  `wedgeIndex`, generation size → `wedgeCount`, reflection parity →
  `mirrored`. With that shim, **all seven placement modes and the whole
  animation system work unchanged on true tilings** — zoetrope birds on a
  genuine {6,4} tiling is the money shot of Phase 2.
- **Controls (via schema, so agents get them for free):**
  `tilingMode: rings | pq`, `pqP: 3..8`, `pqQ: 3..8` (invalid pairs disabled),
  with `symmetry`/`ringCount`/`density` applying in rings mode as today.
- **Acceptance:** {6,4}, {4,5}, {3,7}, {8,3} render with exact edge-to-edge
  adjacency; geodesic guides align with tile edges; deterministic per seed;
  draft quality stays interactive (placement cap respected).

New module: `src/geometry/pqTiling.ts`; rings engine stays as-is (it is the
better instrument for sparse/airy compositions and remains the default for
sprite murmurations).

## 7. Workstream E — Export presets & showcase

*Correction to the outside review: the encoders are already built* — GIF
(gifenc), WebM/MP4 (MediaRecorder), PNG sequence, transparent PNG all shipped
in Phase 1, including background-tab throttling workarounds. Phase 2 is
packaging, one real feature (SVG), and the showcase:

- **One-click export presets** (each = an export config bundle, not new
  machinery): **Social Loop** (1080×1080, seamless loop honoring
  ping-pong via the existing `frameSequence`), **4K Poster** (PNG at poster
  quality), **Transparent Asset**, **Motion Study** (PNG contact sheet of the
  current sheet across placement modes), **Wallpaper** (common desktop/phone
  sizes).
- **SVG export (real, prompt mode):** procedural motifs already build
  Path2D-compatible geometry (`exportSVG.ts` stub documents the plan): one
  `<path>` per motif variant, one `<use>` per placement with
  translate/rotate/scale, `<clipPath><circle>`. True vector posters for
  prompt-mode scenes; raster modes stay PNG with a clear UI note.
- **Showcase page:** a `#/gallery` hash route (no router dependency) rendering
  the recipe collection as cards — engine-rendered live thumbnails, hover to
  play, **"Open in studio"** = the recipe's scene URL (§3). The gallery is
  simultaneously the marketing page, the recipe browser, and proof that
  share links work.

## 8. Sequencing

Ordered so each milestone is independently demoable and later ones compound:

| Milestone | Contents | Why this order |
| --- | --- | --- |
| **M1 — Scene core** | `Scene` type, codec, live URL hash, copy-link, bridge methods | Smallest surface, unlocks everything else |
| **M2 — Recipes + gallery shell** | `recipes.ts`, recipe strip, `#/gallery` cards | Pure consumers of M1; biggest visitor-facing win per line of code |
| **M3 — NL control** | Tier-1 grammar + command bar + patch chips; Tier-2 BYOK behind a flag | Signature feature; grammar is independent of M1/M2 but chips benefit from scene URLs for sharing results |
| **M4 — `{p,q}` engine** | `pqTiling.ts`, ring/wedge shim, schema controls | Deep track; can proceed in parallel from M1 onward, lands whenever ready |
| **M5 — Export presets + SVG** | Preset bundles, SVG for prompt mode, gallery loop previews | Polish pass; benefits from recipes existing to showcase |

The dependency graph is shallow: M2 and M3 both consume M1; M4 and M5 are
parallel tracks. Nothing blocks on the hardest item (M4).

## 9. Risks & mitigations

- **URL length** → diff-against-defaults + deflate; scenes are a few changed
  keys, not full state dumps. Guard: warn past ~2000 chars (never expected).
- **`{p,q}` placement explosion** → generation-depth cutoff + existing
  `maxPlacements` caps; draft mode stays interactive by construction.
- **Choreography breakage on true tilings** → the ring/wedge shim (§6) is a
  named deliverable with its own acceptance test, not an afterthought.
- **NL expectation gap** (users type Shakespeare, Tier 1 knows ~40 words) →
  patch chips make what happened legible; unmatched words are shown, not
  swallowed; Tier 2 BYOK absorbs the long tail.
- **Privacy regression via NL** → Tier 1 is local; Tier 2 is explicit opt-in
  with the key stored client-side; the "nothing leaves your browser" claim
  stays true by default.
- **Shared scenes referencing uploads** → honest partial restore with a
  "drop your image to complete" notice; launch recipes avoid the problem
  entirely by using only bundled assets.

## 10. Acceptance criteria

Phase 2 is done when:

1. Any on-screen scene can be copied as a URL and reproduces **pixel-exact**
   (including animation) in a fresh browser, for prompt-mode and demo-sheet
   scenes.
2. The gallery shows ≥ 8 recipes across all three input modes, each opening
   into the live studio via its scene URL, thumbnails rendered by the engine.
3. Typing `make it denser, more spiraled, stained-glass, with a stronger lens`
   in the command bar visibly applies all four changes offline, with patch
   chips showing exactly what was set.
4. `{6,4}` and `{3,7}` render as true edge-to-edge reflection tilings, guides
   aligned, and **all seven sprite placement modes animate on them unchanged**.
5. Social Loop, 4K Poster, and Transparent Asset presets export in one click;
   prompt-mode scenes export as genuine vector SVG.
6. `window.circleLimit` exposes scenes, recipes, and NL
   (`getScene`/`loadScene`/`getSceneURL`/`listRecipes`/`loadRecipe`/`nlPatch`),
   and `describeControls()` includes the new tiling controls — an agent can
   drive every Phase 2 feature without the UI.
7. `tsc` clean; still zero servers, zero uploads, zero Escher assets.
