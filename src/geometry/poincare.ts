/**
 * Poincaré-disk-inspired mapping helpers (MVP approximation).
 *
 * Hyperbolic radial distance h maps to Euclidean disk radius r via
 * r = tanh(h / 2), so equal hyperbolic steps compress toward the boundary.
 */

export function hyperbolicToDisk(h: number): number {
  return Math.tanh(h / 2);
}

export function diskToHyperbolic(r: number): number {
  const clamped = Math.min(Math.max(r, 0), 0.999999);
  return 2 * Math.atanh(clamped);
}

/**
 * Visual motif scale at disk radius r. Objects shrink as they approach the
 * boundary, matching the 1 - r² falloff of the Poincaré metric factor.
 */
export function motifScaleAt(r: number, base: number, minScale = 0.05): number {
  return base * Math.max(minScale, 1 - r * r);
}

export interface MobiusResult {
  x: number;
  y: number;
  /** Local conformal magnification |f'(z)|. */
  scaleFactor: number;
  /** Local rotation arg(f'(z)) in radians. */
  rotation: number;
}

/**
 * Möbius translation of the Poincaré disk: f(z) = (z + a) / (1 + ā·z) with
 * a = (ax, ay), |a| < 1. This is a hyperbolic isometry — the mathematically
 * correct "lens": regions near -a inflate toward the center while the rest
 * compresses toward the boundary, exactly the bulge in Escher's circle prints.
 *
 * f'(z) = (1 - |a|²) / (1 + ā·z)², so the local magnification is |f'| and the
 * local rotation is arg(f') = -2·arg(1 + ā·z).
 */
export function mobiusTranslate(
  x: number,
  y: number,
  ax: number,
  ay: number,
): MobiusResult {
  // denom = 1 + conj(a)·z
  const dRe = 1 + ax * x + ay * y;
  const dIm = ax * y - ay * x;
  const dMagSq = dRe * dRe + dIm * dIm;
  if (dMagSq < 1e-12) {
    return { x: 0, y: 0, scaleFactor: 1, rotation: 0 };
  }
  // num = z + a
  const nRe = x + ax;
  const nIm = y + ay;
  const fx = (nRe * dRe + nIm * dIm) / dMagSq;
  const fy = (nIm * dRe - nRe * dIm) / dMagSq;
  const aMagSq = ax * ax + ay * ay;
  return {
    x: fx,
    y: fy,
    scaleFactor: (1 - aMagSq) / dMagSq,
    rotation: -2 * Math.atan2(dIm, dRe),
  };
}
