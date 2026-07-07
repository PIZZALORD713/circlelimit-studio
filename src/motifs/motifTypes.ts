export type MotifFamily =
  | "fish"
  | "bird"
  | "butterfly"
  | "bat"
  | "angel"
  | "flower"
  | "mask"
  | "creature"
  | "shard";

export type InputMode = "prompt" | "image" | "spritesheet";

export interface MotifStyle {
  fill: string;
  outline: string;
  detail: string;
  outlineWeight: number;
}

/** A ready-to-stamp motif: one pre-rendered canvas per palette color. */
export interface MotifAsset {
  kind: "procedural" | "image";
  family?: MotifFamily;
  /** Variants indexed by paletteIndex (image motifs may have length 1). */
  variants: HTMLCanvasElement[];
}

export interface MotifOptions {
  seed: string;
  detailLevel?: number;
}

/**
 * Adapter seam for future AI motif generation backends. The MVP ships a local
 * procedural implementation; a remote image-generation adapter can implement
 * the same interface without renderer changes.
 */
export interface MotifGeneratorAdapter {
  generateMotifFromPrompt(prompt: string, options: MotifOptions): Promise<MotifAsset>;
}
