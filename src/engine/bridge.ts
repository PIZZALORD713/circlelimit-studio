/**
 * Runtime control bridge — the programmatic / AI-drivable surface.
 *
 * Mounting {@link useCircleLimitBridge} in the app installs `window.circleLimit`,
 * a small, stable API an agent can call to inspect and drive the live studio:
 * read the control schema, get/patch state, step the animation, and pull a
 * snapshot of the current frame back out (so a vision model can close the loop:
 * see → adjust → see again).
 *
 * It also answers `postMessage` requests, so the studio can be embedded in an
 * iframe and driven by a parent window / orchestrator with no globals shared.
 */
import { useEffect, useRef } from "react";
import type { StudioState } from "../state/useStudioState";
import { DEFAULT_SETTINGS } from "../state/useStudioState";
import type { RenderScene } from "../render/canvasRenderer";
import { exportScenePNG } from "../export/exportPNG";
import { PRESET_LIST } from "../styles/presets";
import { SPRITE_PLACEMENT_MODES } from "../sprites/spriteMapping";
import { DEMO_SHEETS, type DemoSheet } from "../sprites/demoSheets";
import {
  CONTROL_SCHEMA,
  STORE_OF,
  coerceValue,
  describeControls,
  type ControlSpec,
  type StoreName,
} from "./controlSchema";

export const BRIDGE_VERSION = 1;

export interface BridgeDeps {
  studio: StudioState;
  buildScene: (animFrames: number) => RenderScene;
  /** Live animation offset (frames) currently on screen. */
  currentOffset: number;
  exportSize: number;
  frameCount: number;
  placementCount: number;
  selectDemo: (demo: DemoSheet) => void;
}

type StateListener = (state: Record<string, unknown>) => void;

export interface CircleLimitAPI {
  readonly version: number;
  /** Full machine-readable control manifest. */
  getSchema(): ControlSpec[];
  /** Compact grouped text listing of every control, for LLM prompting. */
  describe(): string;
  /** Flattened current state across all four stores. */
  getState(): Record<string, unknown>;
  get(key: string): unknown;
  /** Set one control; value is coerced/clamped to the schema. Returns applied. */
  set(key: string, value: unknown): boolean;
  /**
   * Apply many controls at once. Accepts an object or a JSON string of
   * `{ key: value }`. Unknown/invalid keys are skipped. Returns applied keys.
   */
  patch(patch: Record<string, unknown> | string): string[];
  /** Restore all controls to their defaults (assets are kept). */
  reset(): void;
  randomizeSeed(): void;

  listPresets(): { id: string; label: string }[];
  listPlacementModes(): { id: string; label: string }[];
  listDemos(): { id: string; label: string; description: string }[];
  loadDemo(id: string): boolean;

  play(): void;
  pause(): void;
  togglePlay(): boolean;
  step(delta: number): void;
  setFrame(frame: number): void;
  getFrameCount(): number;
  getPlacementCount(): number;

  /** DataURL of the frame currently on the live canvas (fast, screen-res). */
  snapshot(): string | null;
  /** High-res PNG of the current scene as a dataURL (respects quality caps). */
  exportPNG(opts?: { transparent?: boolean; size?: number }): Promise<string>;
  exportJSON(): string;
  importJSON(json: string): boolean;

  /** Subscribe to state changes; returns an unsubscribe fn. */
  subscribe(listener: StateListener): () => void;
}

declare global {
  interface Window {
    circleLimit?: CircleLimitAPI;
  }
}

function flattenState(studio: StudioState): Record<string, unknown> {
  return {
    ...studio.settings,
    ...studio.imageOptions,
    ...studio.spriteConfig,
    ...studio.animation,
  };
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const UPDATERS: Record<StoreName, keyof StudioState> = {
  settings: "update",
  imageOptions: "updateImageOptions",
  spriteConfig: "updateSpriteConfig",
  animation: "updateAnimation",
};

/**
 * Install and keep fresh `window.circleLimit`. The API object is created once
 * and stable; every method reads live state through a ref, so external callers
 * always act on the current studio.
 */
export function useCircleLimitBridge(deps: BridgeDeps): void {
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const listenersRef = useRef(new Set<StateListener>());

  useEffect(() => {
    const routePatch = (
      input: Record<string, unknown> | string,
    ): string[] => {
      const { studio } = depsRef.current;
      let obj: Record<string, unknown>;
      try {
        obj = typeof input === "string" ? JSON.parse(input) : input;
      } catch {
        return [];
      }
      if (!obj || typeof obj !== "object") return [];

      const byStore: Record<StoreName, Record<string, unknown>> = {
        settings: {},
        imageOptions: {},
        spriteConfig: {},
        animation: {},
      };
      const applied: string[] = [];
      for (const [key, raw] of Object.entries(obj)) {
        const store = STORE_OF[key];
        if (!store) continue;
        const value = coerceValue(key, raw);
        if (value === undefined) continue;
        byStore[store][key] = value;
        applied.push(key);
      }
      for (const store of Object.keys(byStore) as StoreName[]) {
        const patch = byStore[store];
        if (Object.keys(patch).length === 0) continue;
        (studio[UPDATERS[store]] as (p: Record<string, unknown>) => void)(patch);
      }
      return applied;
    };

    const liveCanvas = (): HTMLCanvasElement | null =>
      document.querySelector<HTMLCanvasElement>(".canvas-stage canvas");

    const api: CircleLimitAPI = {
      version: BRIDGE_VERSION,
      getSchema: () => CONTROL_SCHEMA,
      describe: () => describeControls(),
      getState: () => flattenState(depsRef.current.studio),
      get: (key) => flattenState(depsRef.current.studio)[key],
      set: (key, value) => routePatch({ [key]: value }).length > 0,
      patch: (patch) => routePatch(patch),
      reset: () => {
        depsRef.current.studio.update({ ...DEFAULT_SETTINGS });
      },
      randomizeSeed: () => depsRef.current.studio.randomizeSeed(),

      listPresets: () => PRESET_LIST.map((p) => ({ id: p.id, label: p.label })),
      listPlacementModes: () => SPRITE_PLACEMENT_MODES.map((m) => ({ ...m })),
      listDemos: () =>
        DEMO_SHEETS.map((d) => ({ id: d.id, label: d.label, description: d.description })),
      loadDemo: (id) => {
        const demo = DEMO_SHEETS.find((d) => d.id === id);
        if (!demo) return false;
        depsRef.current.selectDemo(demo);
        return true;
      },

      play: () => depsRef.current.studio.updateAnimation({ playing: true }),
      pause: () => depsRef.current.studio.updateAnimation({ playing: false }),
      togglePlay: () => {
        const next = !depsRef.current.studio.animation.playing;
        depsRef.current.studio.updateAnimation({ playing: next });
        return next;
      },
      setFrame: (frame) =>
        depsRef.current.studio.updateAnimation({
          playing: false,
          scrubFrame: Math.max(0, Math.round(frame)),
        }),
      step: (delta) => {
        const d = depsRef.current;
        d.studio.updateAnimation({
          playing: false,
          scrubFrame: Math.max(0, Math.round(d.currentOffset + delta)),
        });
      },
      getFrameCount: () => depsRef.current.frameCount,
      getPlacementCount: () => depsRef.current.placementCount,

      snapshot: () => {
        const c = liveCanvas();
        return c ? c.toDataURL("image/png") : null;
      },
      exportPNG: async (opts) => {
        const d = depsRef.current;
        const blob = await exportScenePNG(
          d.buildScene(d.currentOffset),
          opts?.size ?? d.exportSize,
          opts?.transparent ?? false,
        );
        return blobToDataURL(blob);
      },
      exportJSON: () => depsRef.current.studio.exportSettings(),
      importJSON: (json) => depsRef.current.studio.importSettings(json),

      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
      },
    };

    window.circleLimit = api;

    // Let a parent window drive an embedded studio without shared globals.
    // Request:  { source: "circlelimit", id, method, args }
    // Response: { source: "circlelimit-reply", id, result | error }
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.source !== "circlelimit" || typeof data.method !== "string") return;
      const fn = (api as unknown as Record<string, unknown>)[data.method];
      const reply = (payload: Record<string, unknown>) =>
        e.source &&
        (e.source as Window).postMessage(
          { source: "circlelimit-reply", id: data.id, ...payload },
          "*",
        );
      if (typeof fn !== "function") {
        reply({ error: `unknown method: ${data.method}` });
        return;
      }
      try {
        const result = (fn as (...a: unknown[]) => unknown)(...(data.args ?? []));
        Promise.resolve(result).then(
          (r) => reply({ result: r }),
          (err) => reply({ error: String(err) }),
        );
      } catch (err) {
        reply({ error: String(err) });
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
      if (window.circleLimit === api) delete window.circleLimit;
    };
  }, []);

  // Notify subscribers whenever any observed state changes.
  const stateFingerprint = JSON.stringify(flattenState(deps.studio));
  useEffect(() => {
    const state = flattenState(depsRef.current.studio);
    for (const l of listenersRef.current) {
      try {
        l(state);
      } catch {
        /* a listener throwing must not break the studio */
      }
    }
  }, [stateFingerprint]);
}
