import type { Placement } from "../geometry/placements";
import {
  guideArcsForSymmetry,
  transformCircle,
  circleThrough3Points,
  type GuideArc,
} from "../geometry/geodesics";
import { mobiusTranslate } from "../geometry/poincare";
import type { MotifAsset } from "../motifs/motifTypes";
import type { PresetDef } from "../styles/presets";
import {
  effectiveFrameIndex,
  type SpriteMapContext,
  type SpritePlacementMode,
} from "../sprites/spriteMapping";
import { withAlpha } from "../utils/color";

export interface SpriteScene {
  frames: HTMLCanvasElement[];
  placementMode: SpritePlacementMode;
  mapContext: SpriteMapContext;
  /** Current global animation offset in frames. */
  animFrames: number;
  onionSkinCount: number;
  onionSkinOpacity: number;
  frameScale: number;
  frameRotation: number;
}

export interface RenderScene {
  placements: Placement[];
  preset: PresetDef;
  /** Prompt/image motif; null in sprite mode. */
  motif: MotifAsset | null;
  /** Sprite state; null outside sprite mode. */
  sprite: SpriteScene | null;
  showGuides: boolean;
  guideOpacity: number;
  boundaryStroke: number;
  symmetry: number;
  /** Pre-lens ring radii, for guide rendering. */
  baseRingRadii: number[];
  /** Möbius lens vector, or null when inactive. */
  lens: { ax: number; ay: number } | null;
  /** Omit backgrounds for transparent export. */
  transparent?: boolean;
}

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export const IDENTITY_VIEW: ViewTransform = { zoom: 1, panX: 0, panY: 0 };

/**
 * Render the full disk scene. `size` is the square pixel size of the target;
 * the disk is inscribed with a small margin. Pure function of its inputs.
 */
export function renderCircleLimitCanvas(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  size: number,
  view: ViewTransform = IDENTITY_VIEW,
): void {
  const { preset } = scene;
  ctx.clearRect(0, 0, size, size);

  if (!scene.transparent) {
    ctx.fillStyle = preset.background;
    ctx.fillRect(0, 0, size, size);
  }

  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.94;

  ctx.save();
  ctx.translate(cx + view.panX, cy + view.panY);
  ctx.scale(view.zoom, view.zoom);

  // Clip everything to the disk.
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.clip();

  if (!scene.transparent) {
    ctx.fillStyle = preset.disk;
    ctx.fill();
  }

  if (scene.showGuides) {
    drawGuides(ctx, scene, R);
  }

  if (scene.sprite && scene.sprite.frames.length > 0) {
    drawSpritePlacements(ctx, scene, scene.sprite, R);
  } else if (scene.motif && scene.motif.variants.length > 0) {
    drawMotifPlacements(ctx, scene, scene.motif, R);
  }

  ctx.restore();

  // Boundary circle (drawn unclipped so the stroke is crisp).
  if (scene.boundaryStroke > 0) {
    ctx.save();
    ctx.translate(cx + view.panX, cy + view.panY);
    ctx.scale(view.zoom, view.zoom);
    ctx.strokeStyle = preset.boundary;
    ctx.lineWidth = scene.boundaryStroke * (size / 800);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawGuides(ctx: CanvasRenderingContext2D, scene: RenderScene, R: number) {
  const { preset, lens } = scene;
  ctx.save();
  ctx.strokeStyle = withAlpha(preset.guide, scene.guideOpacity);
  ctx.lineWidth = Math.max(0.6, R / 500);

  const applyLensTo = lens
    ? (x: number, y: number) => mobiusTranslate(x, y, lens.ax, lens.ay)
    : null;
  const lensCircle = (c: GuideArc): GuideArc | null =>
    applyLensTo ? transformCircle(c, applyLensTo) : c;

  const strokeArc = (arc: GuideArc | null) => {
    if (!arc) return;
    ctx.moveTo((arc.cx + arc.r) * R, arc.cy * R);
    ctx.arc(arc.cx * R, arc.cy * R, arc.r * R, 0, Math.PI * 2);
  };

  const ringRadii = scene.baseRingRadii.filter((r) => r > 0.01);

  // Ring circles (Möbius maps circles to circles).
  ctx.beginPath();
  for (const r of ringRadii) {
    strokeArc(lensCircle({ cx: 0, cy: 0, r }));
  }
  ctx.stroke();

  // Symmetry diameters — true geodesics; under a lens they become arcs
  // through the transformed endpoints and center.
  ctx.beginPath();
  for (let k = 0; k < scene.symmetry; k++) {
    const a = (k / scene.symmetry) * Math.PI;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    if (!applyLensTo) {
      ctx.moveTo(-dx * R, -dy * R);
      ctx.lineTo(dx * R, dy * R);
      continue;
    }
    const p1 = applyLensTo(-dx, -dy);
    const p2 = applyLensTo(0, 0);
    const p3 = applyLensTo(dx, dy);
    const arc = circleThrough3Points(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    if (arc) {
      strokeArc(arc);
    } else {
      ctx.moveTo(p1.x * R, p1.y * R);
      ctx.lineTo(p3.x * R, p3.y * R);
    }
  }
  ctx.stroke();

  // Orthogonal arcs (geodesic approximations).
  ctx.beginPath();
  for (const arc of guideArcsForSymmetry(scene.symmetry, ringRadii)) {
    strokeArc(lensCircle(arc));
  }
  ctx.stroke();
  ctx.restore();
}

function stamp(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  p: Placement,
  R: number,
  extraScale: number,
  extraRotation: number,
  opacity: number,
) {
  const d = p.scale * R * extraScale; // motif bounding size in pixels
  if (d < 1) return;
  // Preserve the source aspect ratio (sprite frames are often non-square).
  const aspect = img.width / img.height;
  const w = aspect >= 1 ? d : d * aspect;
  const h = aspect >= 1 ? d / aspect : d;
  ctx.save();
  ctx.translate(p.x * R, p.y * R);
  ctx.rotate(p.rotation + extraRotation);
  if (p.mirrored) ctx.scale(-1, 1);
  ctx.globalAlpha = opacity * p.opacity;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawMotifPlacements(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  motif: MotifAsset,
  R: number,
) {
  const variants = motif.variants;
  for (const p of scene.placements) {
    const img = variants[p.paletteIndex % variants.length];
    stamp(ctx, img, p, R, 1, 0, 1);
  }
}

function drawSpritePlacements(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  sprite: SpriteScene,
  R: number,
) {
  const n = sprite.frames.length;
  const onion =
    sprite.placementMode === "onion-skin" || sprite.onionSkinCount > 0
      ? Math.max(sprite.placementMode === "onion-skin" ? 2 : 0, sprite.onionSkinCount)
      : 0;

  for (const p of scene.placements) {
    const frame = effectiveFrameIndex(
      p,
      n,
      sprite.placementMode,
      sprite.mapContext,
      sprite.animFrames,
    );

    // Onion-skin trails: earlier frames fading out beneath the live frame.
    for (let k = onion; k >= 1; k--) {
      const trailFrame = (((frame - k) % n) + n) % n;
      const opacity = Math.pow(sprite.onionSkinOpacity, k);
      if (opacity < 0.02) continue;
      stamp(
        ctx,
        sprite.frames[trailFrame],
        p,
        R,
        sprite.frameScale,
        sprite.frameRotation,
        opacity,
      );
    }
    stamp(ctx, sprite.frames[frame], p, R, sprite.frameScale, sprite.frameRotation, 1);
  }
}
