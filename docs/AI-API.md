# CircleLimit Studio — Programmatic & AI Control API

CircleLimit Studio is built as a **pure render pipeline**: every pixel is a
function of four serializable state objects (`settings`, `imageOptions`,
`spriteConfig`, `animation`) plus a bitmap asset. That makes the studio
scriptable — an agent can drive the whole instrument without touching the UI,
and read the resulting frame back to decide what to do next.

This document describes that control surface: the **control schema** (the
vocabulary), the **runtime bridge** (`window.circleLimit`), and the
**postMessage transport** (for embedding).

---

## 1. The control schema — the vocabulary

`src/engine/controlSchema.ts` is the single machine-readable description of
every knob: its store, type, range/options, default, and a plain-English note
on what it does to the image.

- `CONTROL_SCHEMA: ControlSpec[]` — the full manifest.
- `describeControls(): string` — a compact grouped text listing, ready to paste
  into an LLM system prompt.
- `coerceValue(key, value)` — clamps/validates a value to a control; returns
  `undefined` for values that can't be made valid.
- `STORE_OF` — maps every settable key to its store, so a flat
  `{ key: value }` patch routes itself.

Keys are **flat and unique** across the four stores, so you never specify which
store a key belongs to — just send `{ symmetry: 6, lensStrength: 0.4 }`.

### Feeding the vocabulary to a model

```js
const vocab = window.circleLimit.describe();
// ## create
// - inputMode (select one of [prompt, image, spritesheet]) — Source of the repeating motif…
// - seed (seed) — Random seed. Same seed + settings → same image…
// ## geometry
// - symmetry (select one of [3, 4, 6, 8, 12, 16]) — Rotational symmetry order…
// - lensStrength (range 0..0.85 step 0.01) — Möbius lens; inflates motifs near the focus…
// …
```

Put that block in the system prompt and instruct the model to reply with a JSON
object of `{ key: value }` pairs. That's the whole tool contract.

---

## 2. The runtime bridge — `window.circleLimit`

Mounting the app installs `window.circleLimit` (see `src/engine/bridge.ts`).
The API object is stable; every method reads live state.

### Inspect

| Method | Returns |
| --- | --- |
| `version` | Bridge version number |
| `getSchema()` | `ControlSpec[]` — the full manifest |
| `describe()` | Compact text listing for prompting |
| `getState()` | Flattened current state across all stores |
| `get(key)` | One value |
| `listPresets()` | `{id,label}[]` style presets |
| `listPlacementModes()` | `{id,label}[]` sprite choreographies |
| `listDemos()` | `{id,label,description}[]` bundled sprite sheets |
| `getFrameCount()` | Frames in the active sprite sheet |
| `getPlacementCount()` | Motifs currently placed in the disk |

### Drive

| Method | Effect |
| --- | --- |
| `set(key, value)` | Set one control (coerced/clamped). Returns `true` if applied |
| `patch(objOrJson)` | Apply many controls at once. Returns applied keys |
| `reset()` | Restore all controls to defaults (assets kept) |
| `randomizeSeed()` | New random seed |
| `loadDemo(id)` | Load a bundled sprite sheet by id |
| `play()` / `pause()` / `togglePlay()` | Animation clock |
| `setFrame(n)` | Pause and hold on frame `n` |
| `step(delta)` | Nudge the held frame by `delta` |

### Observe the result (close the loop)

| Method | Returns |
| --- | --- |
| `snapshot()` | DataURL PNG of the frame on screen (fast, screen-res) |
| `exportPNG({transparent?, size?})` | Promise of a high-res PNG dataURL |
| `exportJSON()` / `importJSON(str)` | Full settings round-trip |
| `subscribe(fn)` | Fires `fn(state)` on any change; returns unsubscribe |

### Scenes — mint and consume share links

| Method | Effect |
| --- | --- |
| `getScene()` | Current scene: `{ v, patch, demo? }` — only non-default controls plus the bundled demo-sheet id, if any |
| `getSceneURL()` | Promise of a share URL (`…#s=<deflated base64url>`) that reproduces the scene pixel-exactly |
| `loadScene(input)` | Apply a scene from a `Scene` object, its JSON, a full share URL, or a bare `#s=…` hash. Promise of success |

Scenes apply through the same validated patch route as `patch()`, so values
are clamped and unknown keys are skipped. Assets travel by reference: bundled
demo sheets reproduce exactly; uploaded images/sheets are never embedded (the
restored scene asks the user to re-add them). The live studio also keeps
`location.hash` up to date as state changes — reading `location.href` after a
patch is equivalent to `getSceneURL()`.

> **Timing note:** `set`/`patch` return synchronously, but `getState`/`get`/
> `snapshot` reflect the *last committed render*. After a patch, wait one frame
> (or use `subscribe`) before reading state or a snapshot back.

### Example — an AI iteration step

```js
const cl = window.circleLimit;

// 1. The model proposed a look from the vocabulary:
cl.patch({
  symmetry: 6,
  stylePreset: "stained-glass-swarm",
  lensStrength: 0.45,
  lensAngle: 90,
  spiralOffset: 0.18,
  density: 2.0,
  placementMode: "spiral-motion",
});

// 2. Let it render, then hand the frame back to the vision model:
await new Promise((r) => cl.subscribe(function once() { r(); }));
const png = cl.snapshot();        // -> data:image/png;base64,…
// feed `png` to the model, get the next patch, repeat.
```

---

## 3. postMessage transport — driving an embedded studio

Embed the studio in an `<iframe>` and drive it from the parent window with no
shared globals. Any bridge method is callable by name:

```js
// Parent window:
const studio = document.querySelector("iframe").contentWindow;

function call(method, ...args) {
  const id = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    window.addEventListener("message", function h(e) {
      if (e.data?.source === "circlelimit-reply" && e.data.id === id) {
        window.removeEventListener("message", h);
        resolve(e.data.result ?? e.data.error);
      }
    });
    studio.postMessage({ source: "circlelimit", id, method, args }, "*");
  });
}

await call("patch", { symmetry: 8, lensStrength: 0.3 });
const frames = await call("getFrameCount");
```

Request shape: `{ source: "circlelimit", id, method, args }`.
Reply shape: `{ source: "circlelimit-reply", id, result | error }`.

---

## 4. Toward a sprite-animation engine

The same seam is the foundation for a headless sprite-animation engine. The
render is already a pure function — `renderCircleLimitCanvas(ctx, scene, size)`
in `src/render/canvasRenderer.ts` — and `buildScene(frame)` produces a scene for
any animation offset. Frame-by-frame the pieces are:

1. `sliceSpriteSheet(bitmap, spriteConfig)` → frame canvases.
2. `generateTessellation(geometry)` (+ `applyLens`) → `Placement[]`.
3. `effectiveFrameIndex(placement, frameCount, mode, ctx, animFrames)` decides
   which frame lands on each placement at time `animFrames` — this is the
   choreography an AI selects via `placementMode`.
4. `renderCircleLimitCanvas` stamps it.

Existing exporters (`src/export/exportAnimation.ts`) already walk frames to emit
GIF / WebM / MP4 / PNG-sequence. An agent orchestrating `placementMode`, `fps`,
`pingPong`, `frameScale`, and per-frame `setFrame`/`exportPNG` calls has a
complete programmatic animation loop today; a future `MotifGeneratorAdapter`
(see `src/motifs/motifTypes.ts`) slots an AI image backend in behind the same
`MotifAsset` contract without touching the renderer.
