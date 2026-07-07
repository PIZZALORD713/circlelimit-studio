/**
 * The AI-facing control contract for CircleLimit Studio.
 *
 * Every pixel the studio renders is a pure function of four serializable state
 * objects (settings / imageOptions / spriteConfig / animation) plus a bitmap
 * asset. This module is the single, machine-readable description of every knob
 * on those objects: its store, type, range, default, and — crucially — a
 * plain-English note on what it does to the image.
 *
 * An LLM or automation reads {@link CONTROL_SCHEMA} (or the compact
 * {@link describeControls} text) to know what it can turn, then emits a flat
 * `{ key: value }` patch that the runtime bridge routes to the right store.
 */
import {
  DEFAULT_SETTINGS,
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_ANIMATION,
  type QualityMode,
} from "../state/useStudioState";
import { DEFAULT_SPRITE_CONFIG } from "../sprites/sliceSpriteSheet";
import { PRESET_LIST } from "../styles/presets";
import { SPRITE_PLACEMENT_MODES } from "../sprites/spriteMapping";

export type StoreName = "settings" | "imageOptions" | "spriteConfig" | "animation";
export type ControlType = "range" | "int" | "select" | "toggle" | "text" | "seed";
export type ControlGroup = "create" | "motion" | "geometry" | "style";

export interface ControlSpec {
  /** Flat key, unique across all four stores. */
  key: string;
  store: StoreName;
  label: string;
  type: ControlType;
  group: ControlGroup;
  min?: number;
  max?: number;
  step?: number;
  /** Allowed values for `select` types. */
  options?: string[];
  default: string | number | boolean;
  /** What changing this does to the rendered image — written for an AI reader. */
  effect: string;
}

const QUALITY_MODES: QualityMode[] = ["draft", "balanced", "high", "poster"];

/**
 * Curated, described controls — the surface an AI should reason about. Keys map
 * 1:1 to the state stores; {@link STORE_OF} covers every settable key including
 * the few advanced ones omitted here.
 */
export const CONTROL_SCHEMA: ControlSpec[] = [
  // ---- Create -----------------------------------------------------------
  {
    key: "inputMode",
    store: "settings",
    label: "Input mode",
    type: "select",
    group: "create",
    options: ["prompt", "image", "spritesheet"],
    default: DEFAULT_SETTINGS.inputMode,
    effect:
      "Source of the repeating motif: 'prompt' draws procedural vector creatures from text, 'image' tiles an uploaded picture, 'spritesheet' maps animation frames into the disk.",
  },
  {
    key: "prompt",
    store: "settings",
    label: "Prompt",
    type: "text",
    group: "create",
    default: DEFAULT_SETTINGS.prompt,
    effect:
      "Text describing the subject in prompt mode. A local grammar maps nouns (fish, bird, butterfly, bat, angel, flower, mask, creature, shard) to procedural motifs. Deterministic per seed.",
  },
  {
    key: "seed",
    store: "settings",
    label: "Seed",
    type: "seed",
    group: "create",
    default: DEFAULT_SETTINGS.seed,
    effect:
      "Random seed. Same seed + same settings always produce the same image; change it to reshuffle motif variation and ring phase.",
  },
  {
    key: "quality",
    store: "settings",
    label: "Quality",
    type: "select",
    group: "create",
    options: QUALITY_MODES,
    default: DEFAULT_SETTINGS.quality,
    effect:
      "Caps total placement count and export resolution: draft (fast, 500) → poster (dense, 9000). Raise for finished renders, lower for responsive editing.",
  },

  // ---- Geometry ---------------------------------------------------------
  {
    key: "symmetry",
    store: "settings",
    label: "Symmetry",
    type: "select",
    group: "geometry",
    options: ["3", "4", "6", "8", "12", "16"],
    default: String(DEFAULT_SETTINGS.symmetry),
    effect:
      "Rotational symmetry order of the whole mandala. Per-ring motif counts snap to a multiple of this, so wedge symmetry is exact. Higher = more petals/arms.",
  },
  {
    key: "ringCount",
    store: "settings",
    label: "Rings",
    type: "int",
    group: "geometry",
    min: 2,
    max: 24,
    step: 1,
    default: DEFAULT_SETTINGS.ringCount,
    effect: "Number of concentric rings from center to boundary. More rings = deeper recession toward infinity.",
  },
  {
    key: "density",
    store: "settings",
    label: "Density",
    type: "range",
    group: "geometry",
    min: 0.4,
    max: 2.4,
    step: 0.05,
    default: DEFAULT_SETTINGS.density,
    effect:
      "How tightly motifs pack around each ring: 0.4 sparse → 2.4 obsessive. Higher fits more motifs per ring and increases overlap.",
  },
  {
    key: "edgeCompression",
    store: "settings",
    label: "Edge compression",
    type: "range",
    group: "geometry",
    min: 0.5,
    max: 1.8,
    step: 0.05,
    default: DEFAULT_SETTINGS.edgeCompression,
    effect: "How fast rings crowd toward the boundary. Higher pushes rings outward faster, compressing the edge.",
  },
  {
    key: "motifScale",
    store: "settings",
    label: "Motif scale",
    type: "range",
    group: "geometry",
    min: 0.4,
    max: 2,
    step: 0.05,
    default: DEFAULT_SETTINGS.motifScale,
    effect: "Overall size multiplier for every motif. Larger overlaps more; smaller opens gaps between forms.",
  },
  {
    key: "spiralOffset",
    store: "settings",
    label: "Spiral offset",
    type: "range",
    group: "geometry",
    min: -0.5,
    max: 0.5,
    step: 0.01,
    default: DEFAULT_SETTINGS.spiralOffset,
    effect:
      "Radians of angular twist added per ring. Non-zero shears the rings into a spiral/vortex; sign sets rotation direction.",
  },
  {
    key: "lensStrength",
    store: "settings",
    label: "Lens strength",
    type: "range",
    group: "geometry",
    min: 0,
    max: 0.85,
    step: 0.01,
    default: DEFAULT_SETTINGS.lensStrength,
    effect:
      "Möbius lens magnitude. 0 = off. Above 0 inflates motifs near the lens focus and compresses the rest toward the boundary — the 'bulge' of Escher's circle prints.",
  },
  {
    key: "lensAngle",
    store: "settings",
    label: "Lens angle",
    type: "range",
    group: "geometry",
    min: 0,
    max: 360,
    step: 5,
    default: DEFAULT_SETTINGS.lensAngle,
    effect: "Direction (degrees) of the lens focus. Only matters when lensStrength > 0.",
  },
  {
    key: "centerVoid",
    store: "settings",
    label: "Center void",
    type: "range",
    group: "geometry",
    min: 0,
    max: 0.5,
    step: 0.01,
    default: DEFAULT_SETTINGS.centerVoid,
    effect: "Radius of the empty hole at the center of the disk. Above ~0.05 it also removes the single center motif.",
  },
  {
    key: "rotationMode",
    store: "settings",
    label: "Motif rotation",
    type: "select",
    group: "geometry",
    options: ["tangent", "center", "outward"],
    default: DEFAULT_SETTINGS.rotationMode,
    effect:
      "How each motif is aimed: 'tangent' follows the ring (swirl), 'center' points inward, 'outward' points to the boundary.",
  },
  {
    key: "mirrorAlternates",
    store: "settings",
    label: "Mirror alternates",
    type: "toggle",
    group: "geometry",
    default: DEFAULT_SETTINGS.mirrorAlternates,
    effect: "Flip every other motif in a ring, so neighbors face each other for an interlocking figure-ground.",
  },
  {
    key: "centerMotif",
    store: "settings",
    label: "Center motif",
    type: "toggle",
    group: "geometry",
    default: DEFAULT_SETTINGS.centerMotif,
    effect: "Draw a single upright motif at the exact center (only when centerVoid is near 0).",
  },
  {
    key: "showGuides",
    store: "settings",
    label: "Geodesic guides",
    type: "toggle",
    group: "geometry",
    default: DEFAULT_SETTINGS.showGuides,
    effect: "Overlay the hyperbolic scaffolding: ring circles, symmetry diameters, and orthogonal geodesic arcs.",
  },
  {
    key: "guideOpacity",
    store: "settings",
    label: "Guide opacity",
    type: "range",
    group: "geometry",
    min: 0.05,
    max: 1,
    step: 0.05,
    default: DEFAULT_SETTINGS.guideOpacity,
    effect: "Opacity of the geodesic guide overlay. Only visible when showGuides is on.",
  },
  {
    key: "boundaryStroke",
    store: "settings",
    label: "Boundary stroke",
    type: "range",
    group: "geometry",
    min: 0,
    max: 12,
    step: 0.5,
    default: DEFAULT_SETTINGS.boundaryStroke,
    effect: "Thickness of the outer circle stroke. 0 hides the boundary ring entirely.",
  },

  // ---- Style ------------------------------------------------------------
  {
    key: "stylePreset",
    store: "settings",
    label: "Style preset",
    type: "select",
    group: "style",
    options: PRESET_LIST.map((p) => p.id),
    default: DEFAULT_SETTINGS.stylePreset,
    effect:
      "Named palette: background, disk fill, motif colors, outline, and boundary. E.g. 'ink-limit' (cream/black woodcut), 'stained-glass-swarm' (jewel tones on near-black).",
  },

  // ---- Motion (sprite mode) --------------------------------------------
  {
    key: "placementMode",
    store: "animation",
    label: "Placement mode",
    type: "select",
    group: "motion",
    options: SPRITE_PLACEMENT_MODES.map((m) => m.id),
    default: DEFAULT_ANIMATION.placementMode,
    effect:
      "Choreography — which sprite frame lands on which placement. sequential-ring/zoetrope-ring cycle frames around each ring; radial-timeline ages frames outward; spiral-motion diagonals; symmetry-echo repeats per wedge; frame-interlock offsets neighbors; onion-skin stacks fading trails.",
  },
  {
    key: "playing",
    store: "animation",
    label: "Playing",
    type: "toggle",
    group: "motion",
    default: DEFAULT_ANIMATION.playing,
    effect: "Run the animation clock. When false, the disk holds on scrubFrame.",
  },
  {
    key: "fps",
    store: "animation",
    label: "FPS",
    type: "int",
    group: "motion",
    min: 1,
    max: 60,
    step: 1,
    default: DEFAULT_ANIMATION.fps,
    effect: "Animation playback speed in frames per second.",
  },
  {
    key: "loop",
    store: "animation",
    label: "Loop",
    type: "toggle",
    group: "motion",
    default: DEFAULT_ANIMATION.loop,
    effect: "Restart from frame 0 at the end instead of stopping.",
  },
  {
    key: "pingPong",
    store: "animation",
    label: "Ping-pong",
    type: "toggle",
    group: "motion",
    default: DEFAULT_ANIMATION.pingPong,
    effect: "Bounce forward then backward through the frames instead of jumping back to the start.",
  },
  {
    key: "direction",
    store: "animation",
    label: "Direction",
    type: "select",
    group: "motion",
    options: ["1", "-1"],
    default: String(DEFAULT_ANIMATION.direction),
    effect: "Reading order of frames around a ring: 1 = clockwise, -1 = counter-clockwise.",
  },
  {
    key: "frameScale",
    store: "animation",
    label: "Frame scale",
    type: "range",
    group: "motion",
    min: 0.4,
    max: 3,
    step: 0.05,
    default: DEFAULT_ANIMATION.frameScale,
    effect: "Size multiplier applied to sprite frames on top of motifScale.",
  },
  {
    key: "frameRotation",
    store: "animation",
    label: "Frame rotation",
    type: "range",
    group: "motion",
    min: -180,
    max: 180,
    step: 1,
    default: DEFAULT_ANIMATION.frameRotation,
    effect: "Extra rotation (degrees) added to every sprite frame, e.g. to re-aim a sheet drawn facing the wrong way.",
  },
  {
    key: "onionSkinCount",
    store: "animation",
    label: "Onion skins",
    type: "int",
    group: "motion",
    min: 0,
    max: 8,
    step: 1,
    default: DEFAULT_ANIMATION.onionSkinCount,
    effect: "Number of trailing earlier frames drawn faded beneath each live frame — motion-blur / manuscript trails.",
  },
  {
    key: "onionSkinOpacity",
    store: "animation",
    label: "Onion skin opacity",
    type: "range",
    group: "motion",
    min: 0.05,
    max: 0.95,
    step: 0.05,
    default: DEFAULT_ANIMATION.onionSkinOpacity,
    effect: "Falloff of the onion-skin trails; each older frame is this fraction of the one in front.",
  },
];

/** Every settable key → its store. Complete (includes advanced slicing keys). */
export const STORE_OF: Record<string, StoreName> = (() => {
  const m: Record<string, StoreName> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) m[k] = "settings";
  for (const k of Object.keys(DEFAULT_IMAGE_OPTIONS)) m[k] = "imageOptions";
  for (const k of Object.keys(DEFAULT_SPRITE_CONFIG)) m[k] = "spriteConfig";
  for (const k of Object.keys(DEFAULT_ANIMATION)) m[k] = "animation";
  return m;
})();

const SPEC_BY_KEY: Record<string, ControlSpec> = Object.fromEntries(
  CONTROL_SCHEMA.map((c) => [c.key, c]),
);

export function specFor(key: string): ControlSpec | undefined {
  return SPEC_BY_KEY[key];
}

/**
 * Coerce and clamp an incoming value to what a control accepts. Unknown keys
 * pass through unchanged (they may be advanced keys not in the curated schema).
 * Returns `undefined` for values that can't be made valid (e.g. a bad select).
 */
export function coerceValue(key: string, value: unknown): unknown {
  const spec = SPEC_BY_KEY[key];
  if (!spec) return value;
  switch (spec.type) {
    case "range":
    case "int": {
      let n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) return undefined;
      if (spec.min !== undefined) n = Math.max(spec.min, n);
      if (spec.max !== undefined) n = Math.min(spec.max, n);
      if (spec.type === "int") n = Math.round(n);
      return n;
    }
    case "toggle":
      return typeof value === "boolean" ? value : value === "true" || value === 1;
    case "select": {
      const s = String(value);
      if (spec.options && !spec.options.includes(s)) return undefined;
      // `symmetry` and `direction` are numeric-valued selects.
      if (key === "symmetry" || key === "direction") return Number(s);
      return s;
    }
    case "text":
    case "seed":
      return String(value);
  }
}

/**
 * A compact human/LLM-readable listing of every control, grouped, one per line:
 *   `key (type, range/options) — effect [default]`.
 * Feed this straight into a system prompt so the model knows the vocabulary.
 */
export function describeControls(): string {
  const groups: ControlGroup[] = ["create", "geometry", "style", "motion"];
  const lines: string[] = [];
  for (const g of groups) {
    lines.push(`## ${g}`);
    for (const c of CONTROL_SCHEMA.filter((x) => x.store && x.group === g)) {
      let domain = "";
      if (c.options) domain = ` one of [${c.options.join(", ")}]`;
      else if (c.min !== undefined) domain = ` ${c.min}..${c.max}${c.step ? ` step ${c.step}` : ""}`;
      else if (c.type === "toggle") domain = " true|false";
      lines.push(`- ${c.key} (${c.type}${domain}) — ${c.effect} [default ${String(c.default)}]`);
    }
  }
  return lines.join("\n");
}
