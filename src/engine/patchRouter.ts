/**
 * Flat-patch routing — the single write path into studio state.
 *
 * A flat `{ key: value }` object (from the AI bridge, a scene URL, or any
 * future controller) is validated per-key via {@link coerceValue}, grouped by
 * owning store via {@link STORE_OF}, and applied through the store updaters.
 * Unknown keys and invalid values are skipped, which makes every consumer
 * forward-compatible with scenes/patches written by newer versions.
 */
import type { StudioState } from "../state/useStudioState";
import { STORE_OF, coerceValue, type StoreName } from "./controlSchema";

const UPDATERS: Record<StoreName, keyof StudioState> = {
  settings: "update",
  imageOptions: "updateImageOptions",
  spriteConfig: "updateSpriteConfig",
  animation: "updateAnimation",
};

/**
 * Apply a flat patch (object or JSON string) to the studio stores.
 * Returns the keys that were actually applied.
 */
export function routeFlatPatch(
  studio: StudioState,
  input: Record<string, unknown> | string,
): string[] {
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
}
