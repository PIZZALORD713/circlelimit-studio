import { useCallback, useEffect, useRef } from "react";
import {
  renderCircleLimitCanvas,
  type RenderScene,
  type ViewTransform,
} from "../render/canvasRenderer";
import { animationOffset } from "../sprites/spriteMapping";
import type { AnimationSettings } from "../state/useStudioState";

interface CircleLimitCanvasProps {
  buildScene: (animFrames: number) => RenderScene;
  frameCount: number;
  animation: AnimationSettings;
  onPause: (atFrame: number) => void;
  onLiveFrame: (frame: number) => void;
}

/**
 * The disk viewport: renders the scene, drives the animation clock while
 * playing, and supports wheel zoom + drag pan (double-click resets).
 */
export function CircleLimitCanvas({
  buildScene,
  frameCount,
  animation,
  onPause,
  onLiveFrame,
}: CircleLimitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const tickRef = useRef(0);
  const lastFrameRef = useRef(-1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback(
    (offset: number) => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const view = viewRef.current;
      const size = canvas.width;
      renderCircleLimitCanvas(
        ctx,
        buildScene(offset),
        size,
        {
          zoom: view.zoom,
          panX: view.panX * (size / canvas.clientWidth || 1),
          panY: view.panY * (size / canvas.clientWidth || 1),
        },
      );
    },
    [buildScene],
  );

  const currentOffset = useCallback(() => {
    if (frameCount <= 1) return 0;
    return animation.playing
      ? animationOffset(tickRef.current, frameCount, animation.pingPong)
      : animationOffset(animation.scrubFrame, frameCount, animation.pingPong);
  }, [animation.playing, animation.pingPong, animation.scrubFrame, frameCount]);

  // Size the canvas to its container (square, dpr-aware).
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      const cssSize = Math.max(64, Math.min(rect.width, rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      canvas.width = Math.round(cssSize * dpr);
      canvas.height = Math.round(cssSize * dpr);
      draw(currentOffset());
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw, currentOffset]);

  // Re-render on any scene/settings change.
  useEffect(() => {
    draw(currentOffset());
  }, [draw, currentOffset]);

  // Animation clock.
  useEffect(() => {
    if (!animation.playing || frameCount <= 1) return;
    tickRef.current = animation.scrubFrame;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      tickRef.current += dt * animation.fps;

      if (!animation.loop && !animation.pingPong && tickRef.current >= frameCount - 1) {
        onPause(frameCount - 1);
        return;
      }

      const offset = animationOffset(tickRef.current, frameCount, animation.pingPong);
      if (offset !== lastFrameRef.current) {
        lastFrameRef.current = offset;
        onLiveFrame(offset);
        draw(offset);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    animation.playing,
    animation.fps,
    animation.loop,
    animation.pingPong,
    frameCount,
    draw,
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    const view = viewRef.current;
    const next = Math.min(8, Math.max(0.5, view.zoom * Math.exp(-e.deltaY * 0.0015)));
    view.zoom = next;
    draw(currentOffset());
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const view = viewRef.current;
    view.panX += e.clientX - dragRef.current.x;
    view.panY += e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    draw(currentOffset());
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };
  const resetView = () => {
    viewRef.current = { zoom: 1, panX: 0, panY: 0 };
    draw(currentOffset());
  };

  return (
    <div className="canvas-stage" ref={containerRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Circular tessellation preview"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={resetView}
      />
    </div>
  );
}
