/**
 * Scene codec — the portable description of "what's on screen".
 *
 * A {@link Scene} is a versioned, compact serialization of the studio:
 * only the controls that differ from defaults (so URLs stay short and old
 * links survive default changes), plus an optional bundled demo-sheet id.
 * Because seed + settings fully determine every pixel, a scene reproduces
 * the image — including animation choreography — exactly.
 *
 * Assets travel by reference, never by value: a scene may name a *bundled*
 * demo sheet; uploaded images/sheets are not embedded (privacy + size, same
 * policy as settings JSON). Loading a scene that depended on an upload
 * restores every setting and asks the user to re-add the asset.
 *
 * Wire format: `#s=` + one marker char + base64url payload.
 *   `Z` — deflate-raw compressed JSON (when CompressionStream is available)
 *   `A` — plain UTF-8 JSON (fallback)
 *
 * Scenes are applied through the same patch router as the AI bridge
 * (`src/engine/patchRouter.ts`), so every value is clamped/validated and
 * unknown keys from newer versions are skipped, not fatal.
 */
import {
  DEFAULT_SETTINGS,
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_ANIMATION,
} from "../state/useStudioState";
import { DEFAULT_SPRITE_CONFIG } from "../sprites/sliceSpriteSheet";

export const SCENE_VERSION = 2;

export interface Scene {
  /** Format version (settings JSON export is v1; URL scenes start at 2). */
  v: number;
  /** Flat controls, only keys that differ from defaults. */
  patch: Record<string, unknown>;
  /** Bundled demo-sheet id, when the scene is built on one. */
  demo?: string;
}

const HASH_PREFIX = "#s=";

const FLAT_DEFAULTS: Record<string, unknown> = {
  ...DEFAULT_SETTINGS,
  ...DEFAULT_IMAGE_OPTIONS,
  ...DEFAULT_SPRITE_CONFIG,
  ...DEFAULT_ANIMATION,
};

/** Keep only known keys whose value differs from the default. */
export function diffAgainstDefaults(
  flat: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!(key in FLAT_DEFAULTS)) continue;
    if (FLAT_DEFAULTS[key] !== value) patch[key] = value;
  }
  return patch;
}

/** Validate an untrusted value into a Scene, or null. */
export function asScene(value: unknown): Scene | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.v !== "number") return null;
  if (!obj.patch || typeof obj.patch !== "object" || Array.isArray(obj.patch)) {
    return null;
  }
  return {
    v: obj.v,
    patch: obj.patch as Record<string, unknown>,
    demo: typeof obj.demo === "string" ? obj.demo : undefined,
  };
}

// ---- bytes <-> base64url -------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---- deflate -------------------------------------------------------------

async function pipeBytes(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ---- encode / decode -------------------------------------------------------

export async function encodeScene(scene: Scene): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(scene));
  if (typeof CompressionStream !== "undefined") {
    try {
      const deflated = await pipeBytes(bytes, new CompressionStream("deflate-raw"));
      return "Z" + bytesToBase64Url(deflated);
    } catch {
      // fall through to the uncompressed marker
    }
  }
  return "A" + bytesToBase64Url(bytes);
}

export async function decodeScene(encoded: string): Promise<Scene | null> {
  try {
    const marker = encoded[0];
    const bytes = base64UrlToBytes(encoded.slice(1));
    let json: string;
    if (marker === "Z") {
      const inflated = await pipeBytes(bytes, new DecompressionStream("deflate-raw"));
      json = new TextDecoder().decode(inflated);
    } else if (marker === "A") {
      json = new TextDecoder().decode(bytes);
    } else {
      return null;
    }
    return asScene(JSON.parse(json));
  } catch {
    return null;
  }
}

// ---- URL hash helpers ------------------------------------------------------

export async function sceneToHash(scene: Scene): Promise<string> {
  return HASH_PREFIX + (await encodeScene(scene));
}

/** Parse `#s=…` from a hash string; null when absent or malformed. */
export async function sceneFromHash(hash: string): Promise<Scene | null> {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const payload = hash.slice(HASH_PREFIX.length);
  return payload ? decodeScene(payload) : null;
}

/**
 * Liberal scene input for the bridge: a Scene object, its JSON, a full share
 * URL, a bare `#s=…` hash, or a bare encoded payload.
 */
export async function sceneFromInput(input: string | object): Promise<Scene | null> {
  if (typeof input === "object") return asScene(input);
  const str = input.trim();
  if (str.startsWith("{")) {
    try {
      return asScene(JSON.parse(str));
    } catch {
      return null;
    }
  }
  const hashIndex = str.indexOf(HASH_PREFIX);
  const payload = hashIndex >= 0 ? str.slice(hashIndex + HASH_PREFIX.length) : str;
  return payload ? decodeScene(payload) : null;
}
