import {
  renderCircleLimitCanvas,
  type RenderScene,
} from "../render/canvasRenderer";

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas export failed"));
    }, "image/png");
  });
}

/** Render the scene at export resolution and return a PNG blob. */
export async function exportScenePNG(
  scene: RenderScene,
  size: number,
  transparent: boolean,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  renderCircleLimitCanvas(ctx, { ...scene, transparent }, size);
  return canvasToBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Give the browser a beat before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
