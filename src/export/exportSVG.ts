import type { RenderScene } from "../render/canvasRenderer";

/**
 * SVG export — Phase 2.
 *
 * Plan: serialize procedural motifs as <path> elements (the drawers in
 * proceduralMotifs.ts already build Path2D-compatible geometry), emit one
 * <use> per placement with transform="translate rotate scale", clip with
 * <clipPath><circle>. Raster motifs / sprite frames embed as data-URL
 * <image> elements with a user-facing warning that content is rasterized.
 */
export function exportSceneAsSVG(_scene: RenderScene): string {
  throw new Error(
    "SVG export is a Phase 2 feature. Use PNG or transparent PNG export.",
  );
}
