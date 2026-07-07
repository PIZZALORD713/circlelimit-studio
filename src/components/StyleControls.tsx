import { PRESET_LIST, type StylePreset } from "../styles/presets";
import type { StudioState, QualityMode } from "../state/useStudioState";
import { Select } from "./Slider";

export function StyleControls({ studio }: { studio: StudioState }) {
  const { settings: s, update } = studio;
  return (
    <section className="panel-section" aria-label="Style controls">
      <h3>Style</h3>
      <div className="preset-grid" role="radiogroup" aria-label="Style preset">
        {PRESET_LIST.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={s.stylePreset === p.id}
            className={`preset-chip${s.stylePreset === p.id ? " active" : ""}`}
            onClick={() => update({ stylePreset: p.id as StylePreset })}
          >
            <span className="preset-swatches" aria-hidden="true">
              {p.palette.slice(0, 4).map((c, i) => (
                <i key={i} style={{ background: c }} />
              ))}
            </span>
            {p.label}
          </button>
        ))}
      </div>
      <Select<QualityMode>
        label="Quality"
        value={s.quality}
        options={[
          { value: "draft", label: "Draft" },
          { value: "balanced", label: "Balanced" },
          { value: "high", label: "High" },
          { value: "poster", label: "Poster" },
        ]}
        onChange={(v) => update({ quality: v })}
      />
    </section>
  );
}
