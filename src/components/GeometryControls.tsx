import { Slider, Toggle, Select } from "./Slider";
import type { StudioState } from "../state/useStudioState";
import type { RotationMode } from "../geometry/placements";

const SYMMETRIES = [3, 4, 6, 8, 12, 16];

export function GeometryControls({ studio }: { studio: StudioState }) {
  const { settings: s, update } = studio;
  return (
    <section className="panel-section" aria-label="Geometry controls">
      <h3>Geometry</h3>
      <Select
        label="Symmetry"
        value={String(s.symmetry)}
        options={SYMMETRIES.map((n) => ({ value: String(n), label: `${n}-fold` }))}
        onChange={(v) => update({ symmetry: Number(v) })}
      />
      <Slider label="Rings" value={s.ringCount} min={2} max={24} onChange={(v) => update({ ringCount: v })} />
      <Slider
        label="Density"
        value={s.density}
        min={0.4}
        max={2.4}
        step={0.05}
        format={(v) => (v < 0.8 ? "sparse" : v < 1.4 ? "balanced" : v < 2 ? "dense" : "obsessive")}
        onChange={(v) => update({ density: v })}
      />
      <Slider
        label="Edge compression"
        value={s.edgeCompression}
        min={0.5}
        max={1.8}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ edgeCompression: v })}
      />
      <Slider
        label="Motif scale"
        value={s.motifScale}
        min={0.4}
        max={2}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ motifScale: v })}
      />
      <Slider
        label="Spiral offset"
        value={s.spiralOffset}
        min={-0.5}
        max={0.5}
        step={0.01}
        format={(v) => `${v.toFixed(2)} rad`}
        onChange={(v) => update({ spiralOffset: v })}
      />
      <Slider
        label="Lens strength"
        value={s.lensStrength}
        min={0}
        max={0.85}
        step={0.01}
        format={(v) => (v === 0 ? "off" : v.toFixed(2))}
        onChange={(v) => update({ lensStrength: v })}
      />
      {s.lensStrength > 0 && (
        <Slider
          label="Lens angle"
          value={s.lensAngle}
          min={0}
          max={360}
          step={5}
          format={(v) => `${v}°`}
          onChange={(v) => update({ lensAngle: v })}
        />
      )}
      <Slider
        label="Center void"
        value={s.centerVoid}
        min={0}
        max={0.5}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => update({ centerVoid: v })}
      />
      <Select<RotationMode>
        label="Motif rotation"
        value={s.rotationMode}
        options={[
          { value: "tangent", label: "Tangent" },
          { value: "center", label: "Toward center" },
          { value: "outward", label: "Outward" },
        ]}
        onChange={(v) => update({ rotationMode: v })}
      />
      <Toggle label="Mirror alternates" checked={s.mirrorAlternates} onChange={(v) => update({ mirrorAlternates: v })} />
      <Toggle label="Center motif" checked={s.centerMotif} onChange={(v) => update({ centerMotif: v })} />
      <Toggle label="Geodesic guides" checked={s.showGuides} onChange={(v) => update({ showGuides: v })} />
      {s.showGuides && (
        <Slider
          label="Guide opacity"
          value={s.guideOpacity}
          min={0.05}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update({ guideOpacity: v })}
        />
      )}
      <Slider
        label="Boundary stroke"
        value={s.boundaryStroke}
        min={0}
        max={12}
        step={0.5}
        onChange={(v) => update({ boundaryStroke: v })}
      />
    </section>
  );
}
