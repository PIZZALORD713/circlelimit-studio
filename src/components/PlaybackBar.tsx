import type { StudioState } from "../state/useStudioState";
import { Slider } from "./Slider";

export function PlaybackBar({
  studio,
  frameCount,
  liveFrame,
}: {
  studio: StudioState;
  frameCount: number;
  liveFrame: number;
}) {
  const { animation: a, updateAnimation } = studio;
  const shown = a.playing ? liveFrame : Math.floor(a.scrubFrame) % Math.max(1, frameCount);

  return (
    <div className="playback-bar" role="group" aria-label="Animation playback">
      <button
        className="primary play-button"
        onClick={() =>
          updateAnimation(
            a.playing ? { playing: false, scrubFrame: shown } : { playing: true },
          )
        }
        aria-label={a.playing ? "Pause animation" : "Play animation"}
      >
        {a.playing ? "❚❚" : "▶"}
      </button>
      <input
        type="range"
        className="scrubber"
        min={0}
        max={Math.max(0, frameCount - 1)}
        step={1}
        value={shown}
        aria-label="Frame scrubber"
        onChange={(e) =>
          updateAnimation({ playing: false, scrubFrame: Number(e.target.value) })
        }
      />
      <span className="frame-indicator" aria-live="polite">
        {shown + 1} / {frameCount}
      </span>
      <div className="playback-options">
        <Slider
          label="Speed"
          value={a.fps}
          min={1}
          max={30}
          format={(v) => `${v} fps`}
          onChange={(v) => updateAnimation({ fps: v })}
        />
        <label className="inline-toggle">
          <input
            type="checkbox"
            checked={a.loop}
            onChange={(e) => updateAnimation({ loop: e.target.checked })}
          />
          Loop
        </label>
        <label className="inline-toggle">
          <input
            type="checkbox"
            checked={a.pingPong}
            onChange={(e) => updateAnimation({ pingPong: e.target.checked })}
          />
          Ping-pong
        </label>
      </div>
    </div>
  );
}
