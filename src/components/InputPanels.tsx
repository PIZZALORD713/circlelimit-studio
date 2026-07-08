import { useId, useRef } from "react";
import type { StudioState } from "../state/useStudioState";
import type { InputMode } from "../motifs/motifTypes";
import { familyFromPrompt } from "../motifs/promptMotifAdapter";
import type { ImageFitMode } from "../motifs/imageMotifAdapter";
import { Slider, Toggle, Select, NumberField } from "./Slider";
import { DEMO_SHEETS, type DemoSheet } from "../sprites/demoSheets";

const MODES: { id: InputMode; label: string }[] = [
  { id: "spritesheet", label: "Sprite Sheet" },
  { id: "prompt", label: "Prompt" },
  { id: "image", label: "Image" },
];

export function InputModeTabs({ studio }: { studio: StudioState }) {
  const { settings, update } = studio;
  return (
    <div className="mode-tabs" role="tablist" aria-label="Input mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={settings.inputMode === m.id}
          className={settings.inputMode === m.id ? "active" : ""}
          onClick={() => update({ inputMode: m.id })}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function PromptInputPanel({
  studio,
  onGenerate,
}: {
  studio: StudioState;
  onGenerate: () => void;
}) {
  const { settings, update } = studio;
  const id = useId();
  return (
    <section className="panel-section" aria-label="Prompt input">
      <label htmlFor={id} className="field-label">
        Describe your motif
      </label>
      <textarea
        id={id}
        rows={3}
        value={settings.prompt}
        placeholder="black ink ravens flying in a spiral"
        onChange={(e) => update({ prompt: e.target.value })}
      />
      <p className="hint">
        Detected motif: <strong>{familyFromPrompt(settings.prompt)}</strong>
      </p>
      <div className="button-row">
        <button className="primary" onClick={onGenerate}>
          Generate
        </button>
        <SeedControls studio={studio} />
      </div>
    </section>
  );
}

export function SeedControls({ studio }: { studio: StudioState }) {
  const { settings, update, randomizeSeed } = studio;
  const id = useId();
  return (
    <div className="seed-controls">
      <label htmlFor={id} className="visually-hidden">
        Seed
      </label>
      <input
        id={id}
        type="text"
        value={settings.seed}
        onChange={(e) => update({ seed: e.target.value })}
        aria-label="Seed"
      />
      <button onClick={randomizeSeed} title="Randomize seed" aria-label="Randomize seed">
        🎲
      </button>
    </div>
  );
}

export function ImageUploadPanel({
  studio,
  onFile,
  hasImage,
}: {
  studio: StudioState;
  onFile: (file: File) => void;
  hasImage: boolean;
}) {
  const { imageOptions: o, updateImageOptions } = studio;
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="panel-section" aria-label="Image upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="visually-hidden"
        aria-label="Upload motif image"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button className="upload-zone" onClick={() => inputRef.current?.click()}>
        {hasImage ? "Replace image…" : "Upload an image (PNG / JPG / WebP)"}
        <span className="hint">Processed locally — never uploaded.</span>
      </button>
      {hasImage && (
        <>
          <Select<ImageFitMode>
            label="Fit mode"
            value={o.fitMode}
            options={[
              { value: "contain", label: "Contain" },
              { value: "cover", label: "Cover" },
              { value: "silhouette", label: "Silhouette" },
            ]}
            onChange={(v) => updateImageOptions({ fitMode: v })}
          />
          {o.fitMode === "silhouette" && (
            <Slider
              label="Threshold"
              value={o.threshold}
              min={20}
              max={250}
              onChange={(v) => updateImageOptions({ threshold: v })}
            />
          )}
          <Slider
            label="Posterize"
            value={o.posterize}
            min={0}
            max={8}
            format={(v) => (v <= 1 ? "off" : `${v} levels`)}
            onChange={(v) => updateImageOptions({ posterize: v })}
          />
          <Toggle
            label="Outline"
            checked={o.outline}
            onChange={(v) => updateImageOptions({ outline: v })}
          />
          <Toggle
            label="Preserve original colors"
            checked={o.preserveColors}
            onChange={(v) => updateImageOptions({ preserveColors: v })}
          />
        </>
      )}
      <div className="button-row">
        <SeedControls studio={studio} />
      </div>
    </section>
  );
}

export function SpriteSheetUploadPanel({
  studio,
  onFile,
  onSelectDemo,
  onOpenGuide,
  activeDemoId,
  hasSheet,
  frameCount,
}: {
  studio: StudioState;
  onFile: (file: File) => void;
  onSelectDemo: (demo: DemoSheet) => void;
  onOpenGuide: () => void;
  activeDemoId: string | null;
  hasSheet: boolean;
  frameCount: number;
}) {
  const { spriteConfig: c, updateSpriteConfig } = studio;
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="panel-section" aria-label="Sprite sheet upload">
      <h3>Demo sprites</h3>
      <p className="hint">Pick a starling animation to see it fill the disk instantly.</p>
      <div className="demo-bank" role="listbox" aria-label="Demo sprite sheets">
        {DEMO_SHEETS.map((demo) => (
          <button
            key={demo.id}
            role="option"
            aria-selected={activeDemoId === demo.id}
            className={`demo-card${activeDemoId === demo.id ? " active" : ""}`}
            onClick={() => onSelectDemo(demo)}
            title={demo.description}
          >
            <img src={demo.thumb} alt="" loading="lazy" />
            <span className="demo-card-label">{demo.label}</span>
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="visually-hidden"
        aria-label="Upload sprite sheet"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button className="upload-zone" onClick={() => inputRef.current?.click()}>
        {hasSheet ? "Replace with your own sheet…" : "…or upload your own sprite sheet"}
        <span className="hint">Rows × columns grid, sliced locally.</span>
      </button>
      <button type="button" className="guide-link" onClick={onOpenGuide}>
        Make your own sheet with AI
        <span className="hint">Prompt any image generator for a CircleLimit-ready sheet →</span>
      </button>
      {hasSheet && (
        <>
          <div className="field-pair">
            <NumberField label="Rows" value={c.rows} min={1} max={32} onChange={(v) => updateSpriteConfig({ rows: v })} />
            <NumberField label="Columns" value={c.columns} min={1} max={64} onChange={(v) => updateSpriteConfig({ columns: v })} />
          </div>
          <div className="field-pair">
            <NumberField label="Margin" value={c.margin} min={0} onChange={(v) => updateSpriteConfig({ margin: v })} />
            <NumberField label="Gap" value={c.gap} min={0} onChange={(v) => updateSpriteConfig({ gap: v })} />
          </div>
          <div className="field-pair">
            <NumberField label="Start frame" value={c.startFrame} min={0} onChange={(v) => updateSpriteConfig({ startFrame: v })} />
            <NumberField
              label="End frame"
              value={c.endFrame}
              min={-1}
              onChange={(v) => updateSpriteConfig({ endFrame: v })}
            />
          </div>
          <NumberField
            label="Frame skip"
            value={c.frameSkip}
            min={0}
            max={8}
            onChange={(v) => updateSpriteConfig({ frameSkip: v })}
          />
          <Toggle
            label="Smart frame detection"
            checked={c.smartSlice}
            onChange={(v) => updateSpriteConfig({ smartSlice: v })}
          />
          <Toggle
            label="Auto-center frames"
            checked={c.autoCenter}
            onChange={(v) => updateSpriteConfig({ autoCenter: v })}
          />
          <Toggle
            label="Key out background"
            checked={c.transparentBackground}
            onChange={(v) => updateSpriteConfig({ transparentBackground: v })}
          />
          {c.transparentBackground && (
            <Slider
              label="Key tolerance"
              value={c.keyTolerance}
              min={10}
              max={150}
              onChange={(v) => updateSpriteConfig({ keyTolerance: v })}
            />
          )}
          <p className="hint">{frameCount} frames extracted.</p>
        </>
      )}
      <div className="button-row">
        <SeedControls studio={studio} />
      </div>
    </section>
  );
}
