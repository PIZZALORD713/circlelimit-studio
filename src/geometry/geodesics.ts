/**
 * Guide geometry: approximations of hyperbolic geodesics for visual reference.
 * Diameters through the center are true geodesics; for off-center guides we
 * draw circular arcs orthogonal to the boundary circle.
 */

export interface GuideArc {
  /** Center of the arc circle in normalized disk coordinates. */
  cx: number;
  cy: number;
  r: number;
}

/**
 * A circle orthogonal to the unit circle whose closest point to the origin is
 * at distance d along direction theta. Satisfies |c|² = r² + 1.
 */
export function orthogonalArc(theta: number, d: number): GuideArc {
  const clamped = Math.min(Math.max(d, 0.05), 0.95);
  // Closest approach at distance d ⇒ |c| - r = d and |c|² - r² = 1
  const centerDist = (1 + clamped * clamped) / (2 * clamped);
  const r = centerDist - clamped;
  return {
    cx: Math.cos(theta) * centerDist,
    cy: Math.sin(theta) * centerDist,
    r,
  };
}

/** Circumscribed circle through three points (null if collinear). */
export function circleThrough3Points(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): GuideArc | null {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  return { cx: ux, cy: uy, r: Math.hypot(ax - ux, ay - uy) };
}

/**
 * Image of a circle under a point transform (Möbius maps circles to circles):
 * sample three points, transform them, and fit the circumscribed circle.
 */
export function transformCircle(
  circle: GuideArc,
  transform: (x: number, y: number) => { x: number; y: number },
): GuideArc | null {
  const pts: number[] = [];
  for (const t of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    const p = transform(circle.cx + Math.cos(t) * circle.r, circle.cy + Math.sin(t) * circle.r);
    pts.push(p.x, p.y);
  }
  return circleThrough3Points(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
}

export function guideArcsForSymmetry(symmetry: number, rings: number[]): GuideArc[] {
  const arcs: GuideArc[] = [];
  const ringSample = rings.filter((_, i) => i % 2 === 0).slice(0, 4);
  for (let k = 0; k < symmetry; k++) {
    const theta = ((k + 0.5) / symmetry) * Math.PI * 2;
    for (const r of ringSample) {
      arcs.push(orthogonalArc(theta, r));
    }
  }
  return arcs;
}
