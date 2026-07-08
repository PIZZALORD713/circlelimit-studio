# CircleLimit Studio — Phase 2: The AI-Playable Instrument

> Phase 1 built the engine. Phase 2 makes the one thing no other pattern tool
> has — a studio an AI can *play* — real, visible, and shareable.

Builds on [PLAN.md](PLAN.md) (Phase 1 architecture) and
[docs/AI-API.md](docs/AI-API.md) (the control bridge).

---

## 1. Thesis

There are a thousand generative mandala toys in the world. There is roughly
**one** browser instrument purpose-built to be played by a language model:
this repo. The differentiated assets are already shipped —

- `controlSchema.ts` describes every knob in machine-readable form, with
  effects written *for an AI reader*, and `describeControls()` renders it as a
  ready-made system prompt;
- the patch router validates and routes flat `{ key: value }` patches;
- `window.circleLimit` + postMessage let any program drive the studio and
  read the frame back (`snapshot()`) to close a see → adjust → see loop.

Phase 2 is **three moves that compound**, in strict order, each independently
demoable. Everything else (recipes, `{p,q}` tiling, export presets, SVG,
gallery) is explicitly deferred — not because it's bad, but because this
project is pre-audience. The optimization target is *demoable, shareable,
novel*, not feature count for imagined users.

```
M1 Scene URLs  →  M2 Natural-language command bar  →  M3 Jam mode
   (shipped)        (the signature feature)             (the thing to film)
```

## 2. M1 — Scene URLs ✅ *(implemented on this branch)*

*The address bar is the save file.* Any impressive result must be a **link**,
not a screenshot, or every demo evaporates on contact.

What shipped:

- **`Scene`** (`src/scenes/sceneCodec.ts`): `{ v, patch, demo? }` — only
  controls that **differ from defaults** (URLs stay short; old links survive
  default changes) plus an optional bundled demo-sheet id.
- **Wire format:** JSON → deflate-raw (`CompressionStream`) → base64url →
  `#s=…`, with an uncompressed fallback marker. A fully art-directed scene is
  ~190 characters.
- **One write path:** scenes apply through the same patch router as the AI
  bridge (`src/engine/patchRouter.ts`, extracted from `bridge.ts`), so every
  value is clamped/validated and unknown keys from newer versions are
  skipped, never fatal.
- **Live hash:** the URL updates (debounced, `replaceState`) as you edit;
  **Copy scene link** sits at the top of the Share & export panel; pasting a
  new `#s=` into an open studio applies it live (`hashchange`).
- **Bridge methods:** `getScene()`, `getSceneURL()`, `loadScene(input)` —
  agents can mint and consume share links.
- **Determinism:** seed + settings fully determine every pixel (FNV-1a →
  mulberry32), so a link reproduces the scene — choreography included —
  **byte-for-byte** (verified: identical 512 px PNG exports across fresh
  browser contexts; see acceptance criteria).
- **Honest constraint:** assets travel by reference, never by value. Bundled
  demo sheets reproduce exactly; scenes built on uploads restore every
  setting and ask the user to re-add the asset. Same privacy policy as
  settings JSON — nothing leaves the browser.

## 3. M2 — Natural-language command bar

Type *"denser, more spiraled, stained-glass, with a stronger lens"* and the
disk responds. The plumbing exists; M2 is the experience. Tiered, because
"everything runs locally" is a brand pillar we won't silently break:

- **Tier 0 — local phrase grammar (works offline, ships first).**
  `src/engine/nlPatch.ts`: a deterministic lexicon mapping phrases to
  *relative* control operations — `"denser"` → `density × 1.25`,
  `"more spiraled"` → `spiralOffset ± 0.08`, `"stained glass"` →
  `stylePreset`, `"stronger lens"` → `lensStrength + 0.15`, `"calmer"`,
  `"reverse"`, `"bigger"`, subject nouns routed to the existing prompt
  grammar. Relative ops nudge from current state and clamp via
  `coerceValue`, so the same word always does something sensible. Zero
  network, zero keys, deterministic — the same philosophy as
  `promptMotifAdapter`.
- **Tier 1 — hosted model (the reason visitors say "whoa").** The site
  already deploys on Vercel (`vercel.json`): a ~40-line serverless function
  (`/api/nl`) holds the API key, is rate-limited per IP, takes
  `{ phrase, state }`, and returns a `{ key: value }` patch. The system
  prompt is literally `describeControls()` — already written for this. No
  visitor setup; graceful fallback to Tier 0 when offline or rate-limited.
  A BYOK field (key stored in `localStorage` only) is the escape hatch for
  heavy users.
- **UI:** a command bar (`⌘K` / `/`). Every applied patch renders as
  **chips** (`density 1.5 → 1.9`, `stylePreset → stained-glass-swarm`);
  unmatched words are shown, not swallowed. The NL bar doubles as a teaching
  tool for the manual controls, and makes Tier 0's limits legible instead of
  mysterious.
- **Bridge method:** `nlPatch(phrase)` → applied patch, so external agents
  and the command bar share one code path.

## 4. M3 — Jam mode

*An AI improvises on the instrument while you watch.* This is the genuinely
novel artifact — the thing to point a camera at, and the demo the API tour
videos in `media/` have been building toward.

- **Loop:** every N seconds, send the model the control vocabulary, current
  state, and `snapshot()` (vision); it returns a patch and one line of
  intent ("pulling the flock into a tighter vortex"). Patch applies through
  the router; chips + commentary render in the UI; repeat.
- **Already-built pieces:** `snapshot()`, `patch()`, `subscribe()`, the
  postMessage transport, and deterministic rendering. New work is the loop
  driver, the jam UI (start/stop, tempo, commentary line), and prompt
  design — not engine work.
- **Safety rails for free:** every model output passes through
  `coerceValue` clamps and quality caps; the blast radius of a bad patch is
  an ugly frame.
- **Capture:** the existing GIF/WebM exporters record a jam; a good jam ends
  as a scene URL (M1) — the AI's best moment becomes a shareable link.
- **Session cost control:** jam sessions are visitor-initiated, capped in
  duration, and reuse the `/api/nl` function's rate limiting.

## 5. Deferred (with reasons)

- **Recipes / gallery.** A recipe is just a named scene URL — after M1 the
  entire feature is a constants file and a strip of thumbnails. Worth doing,
  but it rides along whenever; it is not the differentiator. (Launch recipes
  must use prompt motifs or bundled demo sheets only, so they reproduce
  exactly.)
- **True `{p,q}` tiling.** The most intellectually satisfying item and the
  least visible one — weeks of work most viewers can't distinguish from the
  ring approximation. Revisit when the project has an audience. Technical
  note for then: the `Placement[]` *shape* is engine-agnostic, but sprite
  choreography consumes ring/wedge *semantics* (`ringIndex`, `wedgeIndex`,
  `wedgeCount`), so the tiling engine must synthesize them (generation
  depth → ring, index-in-generation → wedge, reflection parity →
  `mirrored`) for the seven placement modes to keep working. `mobiusTranslate`
  and `geodesics.ts` are correct foundations already in place.
- **Export presets.** GIF, WebM/MP4, PNG sequence, and transparent PNG
  encoders already shipped in Phase 1; presets are packaging polish.
- **SVG export.** Real feature (procedural motifs are already vector-path
  friendly), but a poster format matters more once there are posters people
  want.

## 6. Risks

- **Hosted NL cost/abuse** → per-IP rate limit in the Vercel function, small
  max-token responses, Tier 0 fallback; jam sessions capped.
- **NL expectation gap** (users type poetry, Tier 0 knows ~40 words) →
  chips show exactly what happened; unmatched words surface; Tier 1 absorbs
  the long tail.
- **Privacy pillar erosion** → Tier 0 is local; Tier 1 sends only the phrase
  + flat settings (never images) and says so in the UI; BYOK stays
  client-side.
- **URL length** → diff-vs-defaults + deflate (~190 chars measured); warn
  past 2000 (not expected).
- **Scenes referencing uploads** → honest partial restore with an "add your
  image/sheet to complete it" toast (shipped in M1).

## 7. Acceptance criteria

- **M1 (verified on this branch, headless Chromium):** live `#s=` hash on
  edit; cold load of a share URL restores all controls and the demo sheet;
  512 px PNG exports from the original and restored scenes are
  **byte-identical**; `getScene`/`getSceneURL`/`loadScene` round-trip via
  the bridge; malformed hashes fall back to defaults silently.
- **M2:** the four-clause phrase above visibly applies offline (Tier 0);
  with the hosted tier, a free-form phrase produces a sensible patch in
  < 3 s; every change is chip-visible; `nlPatch` callable from the bridge.
- **M3:** a 60-second unattended jam produces continuously evolving visuals
  with readable commentary, ends with a copyable scene URL, and can be
  exported as GIF/WebM using the existing encoders.
- Throughout: `tsc` clean; no Escher assets; local-first defaults intact.
