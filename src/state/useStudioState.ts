import { useCallback, useMemo, useState } from "react";
import type { InputMode } from "../motifs/motifTypes";
import type { RotationMode } from "../geometry/placements";
import type { StylePreset } from "../styles/presets";
import type { ImageFitMode } from "../motifs/imageMotifAdapter";
import {
  DEFAULT_SPRITE_CONFIG,
  type SpriteSheetConfig,
} from "../sprites/sliceSpriteSheet";
import type { SpritePlacementMode } from "../sprites/spriteMapping";
import { randomSeed } from "../utils/random";

export type QualityMode = "draft" | "balanced" | "high" | "poster";

export const QUALITY_CAPS: Record<QualityMode, { placements: number; exportSize: number }> = {
  draft: { placements: 500, exportSize: 1024 },
  balanced: { placements: 1600, exportSize: 2048 },
  high: { placements: 4000, exportSize: 3072 },
  poster: { placements: 9000, exportSize: 4096 },
};

export interface StudioSettings {
  inputMode: InputMode;
  prompt: string;
  stylePreset: StylePreset;
  symmetry: number;
  ringCount: number;
  density: number;
  edgeCompression: number;
  motifScale: number;
  spiralOffset: number;
  /** Möbius lens magnitude |a|, 0–0.85. 0 disables the lens. */
  lensStrength: number;
  /** Direction of the lens focus in degrees. */
  lensAngle: number;
  mirrorAlternates: boolean;
  rotationMode: RotationMode;
  centerMotif: boolean;
  centerVoid: number;
  showGuides: boolean;
  guideOpacity: number;
  boundaryStroke: number;
  seed: string;
  quality: QualityMode;
}

export interface ImageOptionsState {
  fitMode: ImageFitMode;
  threshold: number;
  posterize: number;
  outline: boolean;
  preserveColors: boolean;
}

export interface AnimationSettings {
  playing: boolean;
  fps: number;
  loop: boolean;
  pingPong: boolean;
  placementMode: SpritePlacementMode;
  direction: 1 | -1;
  onionSkinCount: number;
  onionSkinOpacity: number;
  frameScale: number;
  frameRotation: number;
  /** Manual scrub position (frames) used while paused. */
  scrubFrame: number;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  inputMode: "spritesheet",
  prompt: "black ink ravens flying in a spiral",
  stylePreset: "ink-limit",
  symmetry: 8,
  ringCount: 9,
  density: 1.5,
  edgeCompression: 1,
  motifScale: 1,
  spiralOffset: 0,
  lensStrength: 0,
  lensAngle: 0,
  mirrorAlternates: true,
  rotationMode: "tangent",
  centerMotif: true,
  centerVoid: 0,
  showGuides: false,
  guideOpacity: 0.35,
  boundaryStroke: 3,
  seed: "murmuration",
  quality: "balanced",
};

export const DEFAULT_IMAGE_OPTIONS: ImageOptionsState = {
  fitMode: "contain",
  threshold: 200,
  posterize: 0,
  outline: false,
  preserveColors: true,
};

export const DEFAULT_ANIMATION: AnimationSettings = {
  playing: true,
  fps: 10,
  loop: true,
  pingPong: false,
  placementMode: "zoetrope-ring",
  direction: 1,
  onionSkinCount: 0,
  onionSkinOpacity: 0.5,
  frameScale: 1.35,
  frameRotation: 0,
  scrubFrame: 0,
};

export interface StudioState {
  settings: StudioSettings;
  imageOptions: ImageOptionsState;
  spriteConfig: SpriteSheetConfig;
  animation: AnimationSettings;
  update: (patch: Partial<StudioSettings>) => void;
  updateImageOptions: (patch: Partial<ImageOptionsState>) => void;
  updateSpriteConfig: (patch: Partial<SpriteSheetConfig>) => void;
  updateAnimation: (patch: Partial<AnimationSettings>) => void;
  randomizeSeed: () => void;
  importSettings: (json: string) => boolean;
  exportSettings: () => string;
}

export function useStudioState(): StudioState {
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [imageOptions, setImageOptions] =
    useState<ImageOptionsState>(DEFAULT_IMAGE_OPTIONS);
  const [spriteConfig, setSpriteConfig] =
    useState<SpriteSheetConfig>(DEFAULT_SPRITE_CONFIG);
  const [animation, setAnimation] = useState<AnimationSettings>(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return { ...DEFAULT_ANIMATION, playing: DEFAULT_ANIMATION.playing && !reduced };
  });

  const update = useCallback(
    (patch: Partial<StudioSettings>) => setSettings((s) => ({ ...s, ...patch })),
    [],
  );
  const updateImageOptions = useCallback(
    (patch: Partial<ImageOptionsState>) =>
      setImageOptions((s) => ({ ...s, ...patch })),
    [],
  );
  const updateSpriteConfig = useCallback(
    (patch: Partial<SpriteSheetConfig>) =>
      setSpriteConfig((s) => ({ ...s, ...patch })),
    [],
  );
  const updateAnimation = useCallback(
    (patch: Partial<AnimationSettings>) =>
      setAnimation((s) => ({ ...s, ...patch })),
    [],
  );
  const randomizeSeed = useCallback(() => {
    setSettings((s) => ({ ...s, seed: randomSeed() }));
  }, []);

  const exportSettingsFn = useCallback(() => {
    return JSON.stringify(
      { version: 1, settings, imageOptions, spriteConfig, animation },
      null,
      2,
    );
  }, [settings, imageOptions, spriteConfig, animation]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object" || !parsed.settings) return false;
      setSettings((s) => ({ ...s, ...parsed.settings }));
      if (parsed.imageOptions) setImageOptions((s) => ({ ...s, ...parsed.imageOptions }));
      if (parsed.spriteConfig) setSpriteConfig((s) => ({ ...s, ...parsed.spriteConfig }));
      if (parsed.animation)
        setAnimation((s) => ({ ...s, ...parsed.animation, playing: false }));
      return true;
    } catch {
      return false;
    }
  }, []);

  return useMemo(
    () => ({
      settings,
      imageOptions,
      spriteConfig,
      animation,
      update,
      updateImageOptions,
      updateSpriteConfig,
      updateAnimation,
      randomizeSeed,
      importSettings,
      exportSettings: exportSettingsFn,
    }),
    [
      settings,
      imageOptions,
      spriteConfig,
      animation,
      update,
      updateImageOptions,
      updateSpriteConfig,
      updateAnimation,
      randomizeSeed,
      importSettings,
      exportSettingsFn,
    ],
  );
}
