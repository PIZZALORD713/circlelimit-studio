import type {
  MotifAsset,
  MotifFamily,
  MotifGeneratorAdapter,
  MotifOptions,
} from "./motifTypes";
import { buildProceduralVariants } from "./proceduralMotifs";
import type { PresetDef } from "../styles/presets";

/**
 * Local motif grammar: map subject nouns in the prompt to a motif family.
 * First family whose keyword appears wins; order encodes specificity.
 */
const FAMILY_KEYWORDS: [MotifFamily, string[]][] = [
  ["butterfly", ["butterfly", "butterflies", "moth", "moths"]],
  ["bat", ["bat", "bats", "demon", "demons", "devil", "devils", "dragon", "gargoyle", "imp "]],
  ["angel", ["angel", "angels", "seraph", "saint", "monk", "priest"]],
  [
    "bird",
    ["bird", "raven", "crow", "starling", "sparrow", "swallow", "dove", "eagle", "owl", "gull", "finch", "wing"],
  ],
  [
    "fish",
    ["fish", "koi", "carp", "salmon", "shark", "eel", "trout", "minnow", "pike"],
  ],
  ["flower", ["flower", "lotus", "rose", "petal", "blossom", "tulip", "lily", "bloom"]],
  ["mask", ["mask", "face", "visage", "idol", "totem"]],
  [
    "creature",
    ["goblin", "fox", "frog", "lizard", "creature", "beast", "salamander", "newt", "gecko", "monster", "gremlin", "wolf", "cat", "rabbit", "hare", "mouse", "rat", "snake", "serpent"],
  ],
  ["shard", ["shard", "crystal", "geometric", "abstract", "star", "polygon", "gem", "glass"]],
];

export function familyFromPrompt(prompt: string): MotifFamily {
  const lower = ` ${prompt.toLowerCase()} `;
  for (const [family, words] of FAMILY_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return family;
  }
  return "shard";
}

/**
 * Local procedural adapter — the MVP implementation of the generation seam.
 * A future AI backend implements the same MotifGeneratorAdapter interface.
 */
export function createProceduralAdapter(preset: PresetDef): MotifGeneratorAdapter {
  return {
    async generateMotifFromPrompt(
      prompt: string,
      options: MotifOptions,
    ): Promise<MotifAsset> {
      const family = familyFromPrompt(prompt);
      return {
        kind: "procedural",
        family,
        variants: buildProceduralVariants(family, `${options.seed}:${prompt}`, preset),
      };
    },
  };
}
