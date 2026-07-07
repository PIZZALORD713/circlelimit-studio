import type { SpritePlacementMode } from "./spriteMapping";

export interface DemoSheet {
  id: string;
  label: string;
  description: string;
  /** Full-resolution sheet, loaded on selection. */
  src: string;
  /** Small preview, loaded eagerly in the picker. */
  thumb: string;
  rows: number;
  columns: number;
  /** Placement mode that best shows this cycle off. */
  placementMode: SpritePlacementMode;
}

const BASE = `${import.meta.env.BASE_URL}demo`;

/**
 * Bundled demo sprite sheets — original monochrome starling illustrations
 * created for this project. Each is an 8-frame single-row strip on a
 * transparent background, so smart slicing lands them cleanly.
 */
export const DEMO_SHEETS: DemoSheet[] = [
  {
    id: "flight",
    label: "Starling — Flight",
    description: "A full wing-flap cycle. Loops seamlessly in a zoetrope ring.",
    src: `${BASE}/starling-flight.png`,
    thumb: `${BASE}/thumb/starling-flight.png`,
    rows: 1,
    columns: 8,
    placementMode: "zoetrope-ring",
  },
  {
    id: "takeoff",
    label: "Starling — Take-off",
    description: "Perched to airborne. Reads outward as a radial timeline.",
    src: `${BASE}/starling-takeoff.png`,
    thumb: `${BASE}/thumb/starling-takeoff.png`,
    rows: 1,
    columns: 8,
    placementMode: "radial-timeline",
  },
  {
    id: "landing",
    label: "Starling — Landing",
    description: "Flight to touchdown. Try ping-pong for a hover.",
    src: `${BASE}/starling-landing.png`,
    thumb: `${BASE}/thumb/starling-landing.png`,
    rows: 1,
    columns: 8,
    placementMode: "spiral-motion",
  },
  {
    id: "perched",
    label: "Starling — Perched",
    description: "Eight poses at rest. A still, interlocking chorus.",
    src: `${BASE}/starling-perched.png`,
    thumb: `${BASE}/thumb/starling-perched.png`,
    rows: 1,
    columns: 8,
    placementMode: "symmetry-echo",
  },
];

export const DEFAULT_DEMO_ID = "flight";

/** Curated open, permissively-licensed sprite-sheet resources for BYO sheets. */
export const OPEN_SPRITE_RESOURCES: { label: string; href: string; note: string }[] = [
  { label: "Kenney", href: "https://kenney.nl/assets", note: "CC0 game assets" },
  { label: "OpenGameArt", href: "https://opengameart.org/", note: "mixed open licenses" },
  { label: "itch.io sprites", href: "https://itch.io/game-assets/free/tag-sprites", note: "free asset packs" },
];

export async function loadDemoBitmap(sheet: DemoSheet): Promise<ImageBitmap> {
  const res = await fetch(sheet.src);
  if (!res.ok) throw new Error(`Failed to load demo sheet: ${sheet.label}`);
  return createImageBitmap(await res.blob());
}
