import type { Placement } from "../geometry/placements";

export type SpritePlacementMode =
  | "sequential-ring"
  | "radial-timeline"
  | "spiral-motion"
  | "symmetry-echo"
  | "frame-interlock"
  | "onion-skin"
  | "zoetrope-ring";

export const SPRITE_PLACEMENT_MODES: { id: SpritePlacementMode; label: string }[] = [
  { id: "sequential-ring", label: "Sequential Ring" },
  { id: "radial-timeline", label: "Radial Timeline" },
  { id: "spiral-motion", label: "Spiral Motion" },
  { id: "symmetry-echo", label: "Symmetry Echo" },
  { id: "frame-interlock", label: "Frame Interlock" },
  { id: "onion-skin", label: "Onion Skin Manuscript" },
  { id: "zoetrope-ring", label: "Zoetrope Ring" },
];

export interface SpriteMapContext {
  ringCount: number;
  symmetry: number;
  /** 1 = clockwise, -1 = counterclockwise reading order. */
  direction: 1 | -1;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Base (time-independent) frame index for a placement. Animation adds a
 * global offset on top of this, so every mode also animates.
 */
export function baseFrameIndex(
  p: Placement,
  frameCount: number,
  mode: SpritePlacementMode,
  ctx: SpriteMapContext,
): number {
  if (frameCount <= 0) return 0;
  const n = frameCount;
  const w = p.wedgeIndex * ctx.direction;

  switch (mode) {
    case "sequential-ring":
    case "onion-skin":
    case "zoetrope-ring":
      return mod(w, n);
    case "radial-timeline": {
      const t = ctx.ringCount <= 1 ? 0 : p.ringIndex / (ctx.ringCount - 1);
      return mod(Math.round(t * (n - 1)), n);
    }
    case "spiral-motion":
      return mod(p.ringIndex + w, n);
    case "symmetry-echo": {
      const perWedge = Math.max(1, Math.round(p.wedgeCount / ctx.symmetry));
      return mod(mod(w, perWedge), n);
    }
    case "frame-interlock":
      return mod(w * 2 + p.ringIndex, n);
  }
}

/**
 * Global animation offset in frames, honoring loop / ping-pong. `tick` is a
 * monotonically increasing frame counter (fps-scaled elapsed time).
 */
export function animationOffset(
  tick: number,
  frameCount: number,
  pingPong: boolean,
): number {
  if (frameCount <= 1) return 0;
  if (!pingPong) return mod(Math.floor(tick), frameCount);
  const period = 2 * frameCount - 2;
  const f = mod(Math.floor(tick), period);
  return f < frameCount ? f : period - f;
}

export function effectiveFrameIndex(
  p: Placement,
  frameCount: number,
  mode: SpritePlacementMode,
  ctx: SpriteMapContext,
  animFrames: number,
): number {
  return mod(baseFrameIndex(p, frameCount, mode, ctx) + animFrames, Math.max(1, frameCount));
}
