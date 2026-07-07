export type StylePreset =
  | "ink-limit"
  | "antique-circle"
  | "stained-glass-swarm"
  | "creature-geometry"
  | "minimal-hyperbolic"
  | "bone-obsidian"
  | "red-black-alchemy";

export interface PresetDef {
  id: StylePreset;
  label: string;
  /** Page/canvas background behind the disk. */
  background: string;
  /** Fill inside the disk itself. */
  disk: string;
  /** Motif fill colors, cycled by placement paletteIndex. */
  palette: string[];
  /** Motif outline color. */
  outline: string;
  /** Interior detail line color (hatching, stripes, eyes). */
  detail: string;
  /** Boundary circle stroke color. */
  boundary: string;
  /** Geodesic guide color. */
  guide: string;
  /** Relative outline weight (1 = normal). */
  outlineWeight: number;
}

export const PRESETS: Record<StylePreset, PresetDef> = {
  "ink-limit": {
    id: "ink-limit",
    label: "Ink Limit",
    background: "#151312",
    disk: "#f3ecdb",
    palette: ["#1c1a17", "#f3ecdb", "#1c1a17", "#f3ecdb"],
    outline: "#1c1a17",
    detail: "#f3ecdb",
    boundary: "#1c1a17",
    guide: "#8a8172",
    outlineWeight: 1.4,
  },
  "antique-circle": {
    id: "antique-circle",
    label: "Antique Circle",
    background: "#171310",
    disk: "#e8dcc0",
    palette: ["#8a3324", "#3f5d43", "#31496b", "#b06c2e", "#5c4632", "#26221c"],
    outline: "#26221c",
    detail: "#e8dcc0",
    boundary: "#26221c",
    guide: "#9c8e70",
    outlineWeight: 1,
  },
  "stained-glass-swarm": {
    id: "stained-glass-swarm",
    label: "Stained Glass Swarm",
    background: "#0c0b10",
    disk: "#16141d",
    palette: ["#d94141", "#e8a531", "#3e9e63", "#3a72c4", "#8a4fc9", "#d4667f"],
    outline: "#0a090d",
    detail: "#f5efdf",
    boundary: "#0a090d",
    guide: "#4a4358",
    outlineWeight: 2,
  },
  "creature-geometry": {
    id: "creature-geometry",
    label: "Creature Geometry",
    background: "#101314",
    disk: "#dfd8c8",
    palette: ["#22333b", "#c05941", "#5f7161", "#8f793e", "#403b33"],
    outline: "#1d1a15",
    detail: "#dfd8c8",
    boundary: "#1d1a15",
    guide: "#8c8471",
    outlineWeight: 1.2,
  },
  "minimal-hyperbolic": {
    id: "minimal-hyperbolic",
    label: "Minimal Hyperbolic",
    background: "#101014",
    disk: "#fafafa",
    palette: ["#17171b", "#fafafa"],
    outline: "#17171b",
    detail: "#fafafa",
    boundary: "#17171b",
    guide: "#b5b5bd",
    outlineWeight: 1,
  },
  "bone-obsidian": {
    id: "bone-obsidian",
    label: "Bone + Obsidian",
    background: "#0b0a09",
    disk: "#151311",
    palette: ["#e6ddc9", "#8f8878", "#3a352e", "#c9bfa6"],
    outline: "#e6ddc9",
    detail: "#151311",
    boundary: "#e6ddc9",
    guide: "#5f594d",
    outlineWeight: 0.7,
  },
  "red-black-alchemy": {
    id: "red-black-alchemy",
    label: "Red / Black Alchemy",
    background: "#140f0d",
    disk: "#eee3cd",
    palette: ["#a32b20", "#1e1a17", "#a32b20", "#1e1a17"],
    outline: "#1e1a17",
    detail: "#eee3cd",
    boundary: "#1e1a17",
    guide: "#a0906f",
    outlineWeight: 1.3,
  },
};

export const PRESET_LIST: PresetDef[] = Object.values(PRESETS);
