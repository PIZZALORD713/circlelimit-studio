import { useRef } from "react";
import type { StudioState } from "../state/useStudioState";
import { bestVideoFormat } from "../export/exportAnimation";

interface ExportControlsProps {
  studio: StudioState;
  onCopySceneLink: () => void;
  onExportPNG: (transparent: boolean) => void;
  onExportSequence: () => void;
  onExportGIF: () => void;
  onExportVideo: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  busy: boolean;
}

export function ExportControls({
  studio,
  onCopySceneLink,
  onExportPNG,
  onExportSequence,
  onExportGIF,
  onExportVideo,
  onExportJSON,
  onImportJSON,
  busy,
}: ExportControlsProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const spriteMode = studio.settings.inputMode === "spritesheet";
  const videoFormat = bestVideoFormat();

  return (
    <section className="panel-section" aria-label="Export controls">
      <h3>Share &amp; export</h3>
      <div className="button-column">
        <button onClick={onCopySceneLink}>Copy scene link</button>
        <button disabled={busy} onClick={() => onExportPNG(false)}>
          Export PNG
        </button>
        <button disabled={busy} onClick={() => onExportPNG(true)}>
          Export transparent PNG
        </button>
        {spriteMode && (
          <>
            <button disabled={busy} onClick={onExportGIF}>
              Export GIF (loop)
            </button>
            <button
              disabled={busy || !videoFormat}
              onClick={onExportVideo}
              title={
                videoFormat
                  ? undefined
                  : "Video recording is not supported in this browser."
              }
            >
              Export video{videoFormat ? ` (${videoFormat.extension.toUpperCase()})` : ""}
            </button>
            <button disabled={busy} onClick={onExportSequence}>
              Export PNG sequence
            </button>
          </>
        )}
        <button
          disabled
          title="SVG export ships in Phase 2 — procedural motifs will serialize as vector paths."
        >
          Export SVG (Phase 2)
        </button>
        <button disabled={busy} onClick={onExportJSON}>
          Export settings JSON
        </button>
        <button disabled={busy} onClick={() => importRef.current?.click()}>
          Import settings JSON
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          className="visually-hidden"
          aria-label="Import settings JSON"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportJSON(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="hint">
        A scene link puts the whole scene in the URL — same seed, same motion,
        pixel-exact (bundled demo sheets travel by id; uploads are not embedded).
        Settings JSON captures geometry, style, and sprite config. GIF and video
        exports use the playback speed and ping-pong settings; video records in
        real time.
      </p>
    </section>
  );
}
