import { GIFEncoder, quantize, applyPalette } from "gifenc";
import {
  renderCircleLimitCanvas,
  type RenderScene,
} from "../render/canvasRenderer";
import { canvasToBlob, downloadBlob } from "./exportPNG";

/** Frame order for one export loop, honoring ping-pong. */
export function frameSequence(frameCount: number, pingPong: boolean): number[] {
  const seq = Array.from({ length: frameCount }, (_, i) => i);
  if (!pingPong || frameCount < 3) return seq;
  for (let i = frameCount - 2; i >= 1; i--) seq.push(i);
  return seq;
}

function renderAnimFrame(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  frame: number,
  size: number,
): void {
  renderCircleLimitCanvas(
    ctx,
    { ...scene, sprite: { ...scene.sprite!, animFrames: frame } },
    size,
  );
}

/**
 * Yield a macrotask without setTimeout: browsers clamp chained timers hard in
 * background tabs (up to 60s), which would stall exports. MessageChannel
 * tasks are exempt from timer throttling.
 */
const yieldToUI = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });

/**
 * Encode the animation as a looping GIF, entirely locally. Each frame gets
 * its own 256-color quantized palette.
 */
export async function exportAnimationGIF(
  scene: RenderScene,
  frameCount: number,
  size: number,
  fps: number,
  pingPong: boolean,
): Promise<Blob> {
  if (!scene.sprite) throw new Error("No animation to export");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const gif = GIFEncoder();
  const delay = Math.max(20, Math.round(1000 / fps));
  const seq = frameSequence(frameCount, pingPong);
  for (let i = 0; i < seq.length; i++) {
    renderAnimFrame(ctx, scene, seq[i], size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, size, size, { palette, delay, repeat: 0 });
    await yieldToUI();
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

const VIDEO_MIME_CANDIDATES: { mime: string; extension: string }[] = [
  { mime: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
  { mime: "video/mp4", extension: "mp4" },
  { mime: "video/webm;codecs=vp9", extension: "webm" },
  { mime: "video/webm", extension: "webm" },
];

export function bestVideoFormat(): { mime: string; extension: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const c of VIDEO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return null;
}

/**
 * Record the animation as a video via canvas.captureStream + MediaRecorder.
 * MP4 (H.264) where the browser supports it, WebM otherwise. Recording runs
 * in real time at the animation fps for at least ~3 seconds / 2 loops.
 */
export async function exportAnimationVideo(
  scene: RenderScene,
  frameCount: number,
  size: number,
  fps: number,
  pingPong: boolean,
): Promise<{ blob: Blob; extension: string }> {
  if (!scene.sprite) throw new Error("No animation to export");
  const format = bestVideoFormat();
  if (!format) throw new Error("Video recording is not supported in this browser");

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const seq = frameSequence(frameCount, pingPong);
  const loops = Math.max(2, Math.ceil((3 * fps) / seq.length));

  renderAnimFrame(ctx, scene, seq[0], size);
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: format.mime,
    videoBitsPerSecond: 12_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  const frameMs = 1000 / fps;
  for (let loop = 0; loop < loops; loop++) {
    for (const f of seq) {
      renderAnimFrame(ctx, scene, f, size);
      await new Promise((r) => setTimeout(r, frameMs));
    }
  }
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());

  return { blob: new Blob(chunks, { type: format.mime.split(";")[0] }), extension: format.extension };
}

/**
 * PNG sequence export: render one frame per sprite frame at the current
 * settings. GIF/WebM encoding is Phase 2; a PNG sequence feeds any encoder.
 */
export async function exportAnimationFrames(
  scene: RenderScene,
  frameCount: number,
  size: number,
  transparent: boolean,
): Promise<Blob[]> {
  if (!scene.sprite) return [];
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const blobs: Blob[] = [];
  for (let f = 0; f < frameCount; f++) {
    const frameScene: RenderScene = {
      ...scene,
      transparent,
      sprite: { ...scene.sprite, animFrames: f },
    };
    renderCircleLimitCanvas(ctx, frameScene, size);
    blobs.push(await canvasToBlob(canvas));
  }
  return blobs;
}

export async function downloadFrameSequence(
  blobs: Blob[],
  baseName: string,
): Promise<void> {
  for (let i = 0; i < blobs.length; i++) {
    downloadBlob(blobs[i], `${baseName}-${String(i).padStart(3, "0")}.png`);
    // Space out downloads so the browser doesn't drop any.
    await new Promise((r) => setTimeout(r, 250));
  }
}
