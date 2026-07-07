import type { MotifAsset } from "./motifTypes";
import type { PresetDef } from "../styles/presets";
import { hexToRgb, luminance } from "../utils/color";

export type ImageFitMode = "contain" | "cover" | "silhouette";

export interface ImageMotifOptions {
  fitMode: ImageFitMode;
  /** Luminance above this counts as background in silhouette mode (0–255). */
  threshold: number;
  /** Color levels per channel; 0/1 disables posterize. */
  posterize: number;
  outline: boolean;
  preserveColors: boolean;
}

const MOTIF_SIZE = 512;

export async function loadImageFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(await fileToBlob(file));
}

async function fileToBlob(file: File): Promise<Blob> {
  return file; // File is already a Blob; kept for clarity/extension.
}

/**
 * Turn a locally-loaded image into a stamp-ready motif canvas. All processing
 * is on-device; nothing is uploaded anywhere.
 */
export function createMotifFromImage(
  image: ImageBitmap,
  opts: ImageMotifOptions,
  preset: PresetDef,
): MotifAsset {
  const canvas = document.createElement("canvas");
  canvas.width = MOTIF_SIZE;
  canvas.height = MOTIF_SIZE;
  const ctx = canvas.getContext("2d")!;

  // Fit the source into the square motif box.
  const scale =
    opts.fitMode === "cover"
      ? Math.max(MOTIF_SIZE / image.width, MOTIF_SIZE / image.height)
      : Math.min(MOTIF_SIZE / image.width, MOTIF_SIZE / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (MOTIF_SIZE - w) / 2, (MOTIF_SIZE - h) / 2, w, h);

  const needsPixels =
    opts.fitMode === "silhouette" || opts.posterize > 1 || !opts.preserveColors;
  if (needsPixels) {
    const data = ctx.getImageData(0, 0, MOTIF_SIZE, MOTIF_SIZE);
    const px = data.data;
    const silhouetteColor = hexToRgb(preset.palette[0]);
    const levels = Math.max(2, Math.floor(opts.posterize));
    const q = 255 / (levels - 1);

    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3];
      if (a < 10) continue;
      const lum = luminance(px[i], px[i + 1], px[i + 2]);

      if (opts.fitMode === "silhouette") {
        if (lum > opts.threshold) {
          px[i + 3] = 0; // bright pixel → background
        } else if (!opts.preserveColors) {
          px[i] = silhouetteColor.r;
          px[i + 1] = silhouetteColor.g;
          px[i + 2] = silhouetteColor.b;
          px[i + 3] = 255;
        }
        continue;
      }

      if (opts.posterize > 1) {
        px[i] = Math.round(px[i] / q) * q;
        px[i + 1] = Math.round(px[i + 1] / q) * q;
        px[i + 2] = Math.round(px[i + 2] / q) * q;
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  const finalCanvas = opts.outline ? addOutline(canvas, preset.outline) : canvas;
  return { kind: "image", variants: [finalCanvas] };
}

/** Stroke the alpha edge by stamping the mask offset in 8 directions. */
export function addOutline(
  source: HTMLCanvasElement,
  color: string,
  width = 6,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;

  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    ctx.drawImage(source, Math.cos(angle) * width, Math.sin(angle) * width);
  }
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(source, 0, 0);
  return out;
}
