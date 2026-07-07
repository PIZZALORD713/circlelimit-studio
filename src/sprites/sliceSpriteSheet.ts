import { colorDistanceSq } from "../utils/color";

export interface SpriteSheetConfig {
  rows: number;
  columns: number;
  /** 0 = auto-derive from sheet size. */
  frameWidth: number;
  frameHeight: number;
  margin: number;
  gap: number;
  startFrame: number;
  /** -1 = last frame. */
  endFrame: number;
  frameSkip: number;
  /** Key out the sheet's corner color when the sheet has no alpha. */
  transparentBackground: boolean;
  /** Chroma-key tolerance, 0–150. */
  keyTolerance: number;
  /**
   * Normalize frames: find each frame's content by alpha bounding box and
   * re-center it in a square cell, scaled by a shared group factor so
   * relative pose sizes stay coherent across the animation.
   */
  autoCenter: boolean;
  /**
   * Segment the sheet by connected components instead of rectangular cells:
   * wingtips/beaks that cross grid lines stay attached to their own sprite.
   * The grid is only used to order sprites into frames. Falls back to grid
   * slicing when segmentation fails (e.g. sprites touching each other).
   */
  smartSlice: boolean;
}

export const DEFAULT_SPRITE_CONFIG: SpriteSheetConfig = {
  rows: 1,
  columns: 8,
  frameWidth: 0,
  frameHeight: 0,
  margin: 0,
  gap: 0,
  startFrame: 0,
  endFrame: -1,
  frameSkip: 0,
  transparentBackground: true,
  keyTolerance: 60,
  autoCenter: true,
  smartSlice: true,
};

const MAX_FRAME_SIZE = 512;

/**
 * Slice a sprite sheet into frame canvases.
 *
 * Smart path (default): background-key the whole sheet, label connected
 * components, assign each component to a frame by centroid — so artwork that
 * crosses grid lines stays with its own sprite. Falls back to rectangular
 * grid slicing when segmentation looks degenerate.
 */
export function sliceSpriteSheet(
  image: ImageBitmap,
  cfg: SpriteSheetConfig,
): HTMLCanvasElement[] {
  if (cfg.smartSlice) {
    const smart = smartSlice(image, cfg);
    if (smart) return applyRangeAndNormalize(smart, cfg);
  }
  return applyRangeAndNormalize(gridSlice(image, cfg), cfg);
}

/** Rectangular grid slicing (the fallback path). */
function gridSlice(image: ImageBitmap, cfg: SpriteSheetConfig): HTMLCanvasElement[] {
  const cols = Math.max(1, cfg.columns);
  const rows = Math.max(1, cfg.rows);
  const fw =
    cfg.frameWidth > 0
      ? cfg.frameWidth
      : (image.width - 2 * cfg.margin - (cols - 1) * cfg.gap) / cols;
  const fh =
    cfg.frameHeight > 0
      ? cfg.frameHeight
      : (image.height - 2 * cfg.margin - (rows - 1) * cfg.gap) / rows;
  if (fw <= 0 || fh <= 0) return [];

  // Sample corner color for keying before slicing.
  let keyColor: { r: number; g: number; b: number } | null = null;
  if (cfg.transparentBackground) {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const pctx = probe.getContext("2d")!;
    pctx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
    const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data;
    if (a > 200) keyColor = { r, g, b }; // opaque corner → sheet has a solid bg
  }

  const outScale = Math.min(1, MAX_FRAME_SIZE / Math.max(fw, fh));
  const ow = Math.max(1, Math.round(fw * outScale));
  const oh = Math.max(1, Math.round(fh * outScale));

  const all: HTMLCanvasElement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = cfg.margin + c * (fw + cfg.gap);
      const sy = cfg.margin + r * (fh + cfg.gap);
      const canvas = document.createElement("canvas");
      canvas.width = ow;
      canvas.height = oh;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, sx, sy, fw, fh, 0, 0, ow, oh);

      if (keyColor) {
        const data = ctx.getImageData(0, 0, ow, oh);
        const px = data.data;
        const tolSq = cfg.keyTolerance * cfg.keyTolerance;
        for (let i = 0; i < px.length; i += 4) {
          if (colorDistanceSq(keyColor, px[i], px[i + 1], px[i + 2]) < tolSq) {
            px[i + 3] = 0;
          }
        }
        ctx.putImageData(data, 0, 0);
      }
      all.push(canvas);
    }
  }

  return all;
}

/** Frame range/skip filtering + optional normalization, shared by both paths. */
function applyRangeAndNormalize(
  all: HTMLCanvasElement[],
  cfg: SpriteSheetConfig,
): HTMLCanvasElement[] {
  if (all.length === 0) return all;
  const end = cfg.endFrame >= 0 ? Math.min(cfg.endFrame, all.length - 1) : all.length - 1;
  const start = Math.min(Math.max(cfg.startFrame, 0), end);
  const stride = 1 + Math.max(0, cfg.frameSkip);
  const frames: HTMLCanvasElement[] = [];
  for (let i = start; i <= end; i += stride) frames.push(all[i]);

  return cfg.autoCenter ? normalizeFrames(frames) : frames;
}

// ---------------------------------------------------------------------------
// Smart slicing: connected-component segmentation
// ---------------------------------------------------------------------------

const SMART_MAX_PIXELS = 2_400_000;

interface Component {
  count: number;
  sumX: number;
  sumY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Segment the sheet into sprites by connected components. Each component is
 * assigned to a grid cell by centroid, components sharing a cell merge into
 * one frame, and frames are extracted pixel-exactly (not by rectangle), so a
 * wingtip poking across a grid line stays with its own bird. Returns null
 * when segmentation is degenerate and the caller should grid-slice instead.
 */
function smartSlice(image: ImageBitmap, cfg: SpriteSheetConfig): HTMLCanvasElement[] | null {
  const cols = Math.max(1, cfg.columns);
  const rows = Math.max(1, cfg.rows);
  const expected = cols * rows;
  if (expected < 2) return null;

  // Draw the sheet, downscaled if enormous.
  const scale = Math.min(1, Math.sqrt(SMART_MAX_PIXELS / (image.width * image.height)));
  const W = Math.max(1, Math.round(image.width * scale));
  const H = Math.max(1, Math.round(image.height * scale));
  const sheet = document.createElement("canvas");
  sheet.width = W;
  sheet.height = H;
  const sctx = sheet.getContext("2d")!;
  sctx.drawImage(image, 0, 0, W, H);
  const data = sctx.getImageData(0, 0, W, H);
  const px = data.data;

  // Background keying on the full sheet (corner sample), or native alpha.
  const cr = px[0];
  const cg = px[1];
  const cb = px[2];
  const ca = px[3];
  const useKey = ca > 200; // opaque corner → solid background sheet
  if (useKey && !cfg.transparentBackground) return null; // no way to segment
  const tolSq = cfg.keyTolerance * cfg.keyTolerance;
  const key = { r: cr, g: cg, b: cb };

  const n = W * H;
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (px[o + 3] <= ALPHA_CUTOFF) continue;
    if (useKey && colorDistanceSq(key, px[o], px[o + 1], px[o + 2]) < tolSq) {
      px[o + 3] = 0; // key out for the extracted output too
      continue;
    }
    solid[i] = 1;
  }

  // Connected-component labeling (8-connectivity, iterative BFS).
  const labels = new Int32Array(n); // 0 = unlabeled/background
  const comps: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < n; start++) {
    if (!solid[start] || labels[start] !== 0) continue;
    const id = comps.length + 1;
    const comp: Component = {
      count: 0,
      sumX: 0,
      sumY: 0,
      minX: W,
      minY: H,
      maxX: -1,
      maxY: -1,
    };
    stack.push(start);
    labels[start] = id;
    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % W;
      const y = (i / W) | 0;
      comp.count++;
      comp.sumX += x;
      comp.sumY += y;
      if (x < comp.minX) comp.minX = x;
      if (x > comp.maxX) comp.maxX = x;
      if (y < comp.minY) comp.minY = y;
      if (y > comp.maxY) comp.maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= W) continue;
          const ni = ny * W + nx;
          if (solid[ni] && labels[ni] === 0) {
            labels[ni] = id;
            stack.push(ni);
          }
        }
      }
    }
    comps.push(comp);
  }
  if (comps.length === 0) return null;

  // Assign components to grid cells by centroid; merge per cell.
  const cellW = W / cols;
  const cellH = H / rows;
  const clusters = new Map<number, number[]>(); // cell index → component ids
  for (let c = 0; c < comps.length; c++) {
    const comp = comps[c];
    const col = Math.min(cols - 1, Math.max(0, Math.floor(comp.sumX / comp.count / cellW)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(comp.sumY / comp.count / cellH)));
    const cell = row * cols + col;
    const list = clusters.get(cell);
    if (list) list.push(c + 1);
    else clusters.set(cell, [c + 1]);
  }

  // Drop noise clusters (stray keying speckle in otherwise-empty cells).
  let largestCluster = 0;
  const clusterSize = new Map<number, number>();
  for (const [cell, ids] of clusters) {
    const size = ids.reduce((acc, id) => acc + comps[id - 1].count, 0);
    clusterSize.set(cell, size);
    if (size > largestCluster) largestCluster = size;
  }
  for (const [cell, size] of clusterSize) {
    if (size < largestCluster * 0.01) clusters.delete(cell);
  }

  // Degenerate segmentation (sprites touching → one blob, or grid mismatch):
  // let the grid path handle it.
  if (clusters.size < Math.max(2, Math.ceil(expected / 2))) return null;

  // Extract each cluster pixel-exactly, row-major order.
  const ordered = [...clusters.entries()].sort((a, b) => a[0] - b[0]);
  const frames: HTMLCanvasElement[] = [];
  for (const [, ids] of ordered) {
    // Ignore speck components inside the cluster when sizing the frame.
    const main = Math.max(...ids.map((id) => comps[id - 1].count));
    const kept = ids.filter((id) => comps[id - 1].count >= Math.max(6, main * 0.002));
    const inCluster = new Uint8Array(comps.length + 1);
    for (const id of kept) inCluster[id] = 1;

    let minX = W;
    let minY = H;
    let maxX = -1;
    let maxY = -1;
    for (const id of kept) {
      const b = comps[id - 1];
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }
    if (maxX < 0) continue;

    const fw = maxX - minX + 1;
    const fh = maxY - minY + 1;
    const frame = document.createElement("canvas");
    frame.width = fw;
    frame.height = fh;
    const fctx = frame.getContext("2d")!;
    const out = fctx.createImageData(fw, fh);
    const op = out.data;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const si = y * W + x;
        if (!inCluster[labels[si]]) continue;
        const so = si * 4;
        const doff = ((y - minY) * fw + (x - minX)) * 4;
        op[doff] = px[so];
        op[doff + 1] = px[so + 1];
        op[doff + 2] = px[so + 2];
        op[doff + 3] = px[so + 3];
      }
    }
    fctx.putImageData(out, 0, 0);
    frames.push(frame);
  }

  return frames.length >= 2 ? frames : null;
}

interface ContentBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ALPHA_CUTOFF = 16;

/** Bounding box of non-transparent pixels, or null if the frame is empty. */
function contentBounds(canvas: HTMLCanvasElement): ContentBounds | null {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const px = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (px[row + x * 4 + 3] > ALPHA_CUTOFF) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

const CONTENT_PADDING = 1.08;

/**
 * Re-center each frame's content in a square cell. The cell size comes from
 * the largest content box in the group (one shared scale), so a frame with
 * folded wings stays smaller than one mid-flap — sheets with drifting or
 * misaligned subjects land dead-center without per-frame size pulsing.
 */
function normalizeFrames(frames: HTMLCanvasElement[]): HTMLCanvasElement[] {
  const bounds = frames.map(contentBounds);
  let maxDim = 0;
  for (const b of bounds) {
    if (b) maxDim = Math.max(maxDim, b.w, b.h);
  }
  if (maxDim === 0) return frames;

  const cell = Math.ceil(maxDim * CONTENT_PADDING);
  const outSide = Math.min(cell, MAX_FRAME_SIZE);
  const scale = outSide / cell;

  return frames.map((frame, i) => {
    const b = bounds[i];
    if (!b) return frame;
    const out = document.createElement("canvas");
    out.width = outSide;
    out.height = outSide;
    const ctx = out.getContext("2d")!;
    const dw = b.w * scale;
    const dh = b.h * scale;
    ctx.drawImage(
      frame,
      b.x,
      b.y,
      b.w,
      b.h,
      (outSide - dw) / 2,
      (outSide - dh) / 2,
      dw,
      dh,
    );
    return out;
  });
}
