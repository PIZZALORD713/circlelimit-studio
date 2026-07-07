import { useEffect, useMemo, useRef } from "react";
import type { StudioState } from "../state/useStudioState";
import type { MotifAsset } from "../motifs/motifTypes";
import { PRESETS } from "../styles/presets";

interface InspectorPanelProps {
  studio: StudioState;
  motif: MotifAsset | null;
  frames: HTMLCanvasElement[];
  placementCount: number;
  caps: { placements: number; exportSize: number };
}

function MotifPreview({ motif }: { motif: MotifAsset }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const src = motif.variants[0];
    if (src) ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  }, [motif]);
  return (
    <canvas
      ref={ref}
      width={128}
      height={128}
      className="motif-preview"
      role="img"
      aria-label="Current motif preview"
    />
  );
}

function FrameStrip({ frames }: { frames: HTMLCanvasElement[] }) {
  const thumbs = useMemo(
    () =>
      frames.slice(0, 24).map((f) => {
        const t = document.createElement("canvas");
        t.width = 72;
        t.height = 72;
        const ctx = t.getContext("2d")!;
        // Contain-fit so non-square frames aren't stretched.
        const fit = Math.min(72 / f.width, 72 / f.height);
        const w = f.width * fit;
        const h = f.height * fit;
        ctx.drawImage(f, (72 - w) / 2, (72 - h) / 2, w, h);
        return t.toDataURL();
      }),
    [frames],
  );
  return (
    <div className="frame-strip" aria-label="Sprite frames">
      {thumbs.map((src, i) => (
        <img key={i} src={src} alt={`Frame ${i + 1}`} />
      ))}
      {frames.length > 24 && <span className="hint">+{frames.length - 24} more</span>}
    </div>
  );
}

export function InspectorPanel({
  studio,
  motif,
  frames,
  placementCount,
  caps,
}: InspectorPanelProps) {
  const { settings: s } = studio;
  const preset = PRESETS[s.stylePreset];
  const spriteMode = s.inputMode === "spritesheet";

  return (
    <aside className="inspector" aria-label="Inspector">
      <h3>Inspector</h3>

      {spriteMode ? (
        frames.length > 0 ? (
          <FrameStrip frames={frames} />
        ) : (
          <p className="hint">Upload a sprite sheet to see frames here.</p>
        )
      ) : motif ? (
        <MotifPreview motif={motif} />
      ) : (
        <p className="hint">No motif yet.</p>
      )}

      <dl className="settings-readout">
        <div>
          <dt>Mode</dt>
          <dd>{s.inputMode}</dd>
        </div>
        {motif?.family && (
          <div>
            <dt>Motif family</dt>
            <dd>{motif.family}</dd>
          </div>
        )}
        <div>
          <dt>Symmetry</dt>
          <dd>{s.symmetry}-fold</dd>
        </div>
        <div>
          <dt>Rings</dt>
          <dd>{s.ringCount}</dd>
        </div>
        <div>
          <dt>Placements</dt>
          <dd>
            {placementCount} / {caps.placements}
          </dd>
        </div>
        {spriteMode && (
          <div>
            <dt>Frames</dt>
            <dd>{frames.length}</dd>
          </div>
        )}
        <div>
          <dt>Preset</dt>
          <dd>{preset.label}</dd>
        </div>
        <div>
          <dt>Palette</dt>
          <dd className="palette-dots">
            {preset.palette.map((c, i) => (
              <i key={i} style={{ background: c }} title={c} />
            ))}
          </dd>
        </div>
        <div>
          <dt>Seed</dt>
          <dd>
            <code>{s.seed}</code>
          </dd>
        </div>
        <div>
          <dt>Export size</dt>
          <dd>{caps.exportSize}px</dd>
        </div>
      </dl>

      <section className="notes" aria-label="Generation notes">
        <h4>Notes</h4>
        <p>
          Geometry follows a Poincaré-disk-inspired mapping: rings sit at equal
          hyperbolic steps and motifs shrink with 1 − r², approaching infinity at the
          boundary.
        </p>
        <p className="legal-note">
          CircleLimit Studio uses only the geometric principles of hyperbolic
          tessellation. No M.C. Escher artwork is bundled, traced, or reproduced —
          outputs are original works.
        </p>
      </section>
    </aside>
  );
}
