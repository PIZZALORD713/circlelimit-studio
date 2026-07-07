import {
  hyperbolicToDisk,
  diskToHyperbolic,
  motifScaleAt,
  mobiusTranslate,
} from "./poincare";
import { rngFromSeed } from "../utils/random";

export type RotationMode = "tangent" | "center" | "outward";

export interface Placement {
  id: string;
  ringIndex: number;
  wedgeIndex: number;
  /** Number of motifs in this ring (needed for sprite frame mapping). */
  wedgeCount: number;
  x: number;
  y: number;
  radius: number;
  theta: number;
  /** Motif diameter as a fraction of the disk radius. */
  scale: number;
  rotation: number;
  mirrored: boolean;
  opacity: number;
  paletteIndex: number;
}

export interface GeometrySettings {
  symmetry: number;
  ringCount: number;
  /** 0.4 (sparse) .. 2.4 (obsessive). */
  density: number;
  /** 0.5 .. 1.8 — higher pushes rings toward the boundary faster. */
  edgeCompression: number;
  /** Motif size multiplier. */
  motifScale: number;
  /** Radians of angular twist added per ring. */
  spiralOffset: number;
  mirrorAlternates: boolean;
  rotationMode: RotationMode;
  centerMotif: boolean;
  /** Disk radius of the empty center region, 0..0.5. */
  centerVoid: number;
  seed: string;
  /** Hard cap on total placements (quality mode). */
  maxPlacements: number;
}

// Tuned so adjacent motifs slightly overlap both angularly and radially at
// density 1: the tessellation reads as interlocking figure-ground, not stamps.
const BASE_MOTIF_SIZE = 0.34;
const SPACING = 1.0;

/**
 * Generate a ring-based Poincaré-disk-inspired tessellation.
 *
 * Rings sit at equal hyperbolic steps (so they compress toward the boundary),
 * motif scale follows 1 - r², and per-ring counts are snapped to a multiple of
 * the symmetry order so wedge symmetry is exact. Deterministic per seed.
 */
export function generateTessellation(g: GeometrySettings): Placement[] {
  const rng = rngFromSeed(g.seed);
  const placements: Placement[] = [];
  const paletteCycle = 6;

  const baseScale = BASE_MOTIF_SIZE * g.motifScale;

  if (g.centerMotif && g.centerVoid < 0.05) {
    placements.push({
      id: "center",
      ringIndex: -1,
      wedgeIndex: 0,
      wedgeCount: 1,
      x: 0,
      y: 0,
      radius: 0,
      theta: 0,
      scale: baseScale * 1.35,
      rotation: rng() * Math.PI * 2 * 0, // upright center motif
      mirrored: false,
      opacity: 1,
      paletteIndex: 0,
    });
  }

  const h0 = diskToHyperbolic(Math.max(g.centerVoid, 0.02));
  const step = 0.5 * g.edgeCompression;
  const globalPhase = rng() * ((Math.PI * 2) / Math.max(g.symmetry, 1));

  for (let i = 0; i < g.ringCount; i++) {
    if (placements.length >= g.maxPlacements) break;

    const h = h0 + (i + 1) * step;
    const r = hyperbolicToDisk(h);
    if (r > 0.995) break;

    const scale = motifScaleAt(r, baseScale);
    // How many motifs fit around this ring at this scale, snapped to symmetry.
    const circumference = 2 * Math.PI * r;
    const footprint = (scale * SPACING) / g.density;
    const rawCount = Math.max(g.symmetry, Math.round(circumference / footprint));
    const count = Math.max(1, Math.round(rawCount / g.symmetry)) * g.symmetry;

    const stagger = i % 2 === 1 ? Math.PI / count : 0;
    const twist = g.spiralOffset * i;

    for (let j = 0; j < count; j++) {
      if (placements.length >= g.maxPlacements) break;
      const theta = (j / count) * Math.PI * 2 + stagger + twist + globalPhase;
      const mirrored = g.mirrorAlternates && j % 2 === 1;

      let rotation: number;
      switch (g.rotationMode) {
        case "tangent":
          rotation = theta + Math.PI / 2;
          break;
        case "center":
          rotation = theta + Math.PI;
          break;
        case "outward":
          rotation = theta;
          break;
      }

      placements.push({
        id: `${i}:${j}`,
        ringIndex: i,
        wedgeIndex: j,
        wedgeCount: count,
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r,
        radius: r,
        theta,
        scale,
        rotation,
        mirrored,
        opacity: 1,
        paletteIndex: (i + j) % paletteCycle,
      });
    }
  }

  return placements;
}

const MAX_LENSED_SCALE = 0.7;

/**
 * Apply a Möbius lens (hyperbolic isometry) to a tessellation. Positions,
 * scales, and rotations transform conformally, so motifs near the lens focus
 * inflate while the rest compress toward the boundary — the "bulge" of
 * Escher's circle prints. Identity when the lens vector is ~zero.
 */
export function applyLens(placements: Placement[], ax: number, ay: number): Placement[] {
  if (ax * ax + ay * ay < 1e-6) return placements;
  return placements.map((p) => {
    const m = mobiusTranslate(p.x, p.y, ax, ay);
    return {
      ...p,
      x: m.x,
      y: m.y,
      radius: Math.hypot(m.x, m.y),
      scale: Math.min(p.scale * m.scaleFactor, MAX_LENSED_SCALE),
      rotation: p.rotation + m.rotation,
    };
  });
}
