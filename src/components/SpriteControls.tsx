import type { StudioState } from "../state/useStudioState";
import {
  SPRITE_PLACEMENT_MODES,
  type SpritePlacementMode,
} from "../sprites/spriteMapping";
import { Slider, Toggle, Select } from "./Slider";

export function SpriteControls({ studio }: { studio: StudioState }) {
  const { animation: a, updateAnimation } = studio;
  return (
    <section className="panel-section" aria-label="Sprite placement controls">
      <h3>Motion Mapping</h3>
      <Select<SpritePlacementMode>
        label="Placement mode"
        value={a.placementMode}
        options={SPRITE_PLACEMENT_MODES.map((m) => ({ value: m.id, label: m.label }))}
        onChange={(v) => updateAnimation({ placementMode: v })}
      />
      <Select
        label="Direction"
        value={String(a.direction)}
        options={[
          { value: "1", label: "Clockwise" },
          { value: "-1", label: "Counterclockwise" },
        ]}
        onChange={(v) => updateAnimation({ direction: Number(v) as 1 | -1 })}
      />
      <Slider
        label="Frame scale"
        value={a.frameScale}
        min={0.5}
        max={2.5}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => updateAnimation({ frameScale: v })}
      />
      <Slider
        label="Frame rotation"
        value={a.frameRotation}
        min={-180}
        max={180}
        step={5}
        format={(v) => `${v}°`}
        onChange={(v) => updateAnimation({ frameRotation: v })}
      />
      <Slider
        label="Onion skins"
        value={a.onionSkinCount}
        min={0}
        max={6}
        onChange={(v) => updateAnimation({ onionSkinCount: v })}
      />
      {(a.onionSkinCount > 0 || a.placementMode === "onion-skin") && (
        <Slider
          label="Onion opacity"
          value={a.onionSkinOpacity}
          min={0.1}
          max={0.9}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => updateAnimation({ onionSkinOpacity: v })}
        />
      )}
      <Toggle label="Ping-pong" checked={a.pingPong} onChange={(v) => updateAnimation({ pingPong: v })} />
    </section>
  );
}
