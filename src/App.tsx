import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AboutPage } from "./components/AboutPage";
import {
  QUALITY_CAPS,
  useStudioState,
} from "./state/useStudioState";
import { PRESETS } from "./styles/presets";
import { generateTessellation, applyLens } from "./geometry/placements";
import type { MotifAsset } from "./motifs/motifTypes";
import { buildProceduralVariants } from "./motifs/proceduralMotifs";
import { familyFromPrompt } from "./motifs/promptMotifAdapter";
import { createMotifFromImage, loadImageFile } from "./motifs/imageMotifAdapter";
import { sliceSpriteSheet } from "./sprites/sliceSpriteSheet";
import {
  DEMO_SHEETS,
  DEFAULT_DEMO_ID,
  loadDemoBitmap,
  type DemoSheet,
} from "./sprites/demoSheets";
import type { RenderScene } from "./render/canvasRenderer";
import { exportScenePNG, downloadBlob } from "./export/exportPNG";
import {
  exportAnimationFrames,
  downloadFrameSequence,
  exportAnimationGIF,
  exportAnimationVideo,
} from "./export/exportAnimation";
import {
  InputModeTabs,
  PromptInputPanel,
  ImageUploadPanel,
  SpriteSheetUploadPanel,
} from "./components/InputPanels";
import { GeometryControls } from "./components/GeometryControls";
import { StyleControls } from "./components/StyleControls";
import { SpriteControls } from "./components/SpriteControls";
import { ExportControls } from "./components/ExportControls";
import { CircleLimitCanvas } from "./components/CircleLimitCanvas";
import { PlaybackBar } from "./components/PlaybackBar";
import { InspectorPanel } from "./components/InspectorPanel";
import { useCircleLimitBridge } from "./engine/bridge";

type Route = "studio" | "about";

function routeFromPath(pathname: string): Route {
  return pathname.replace(/\/+$/, "") === "/about" ? "about" : "studio";
}

type PanelTab = "create" | "motion" | "geometry" | "style" | "export" | "info";

const PANEL_TABS: { id: PanelTab; label: string; spriteOnly?: boolean }[] = [
  { id: "create", label: "Create" },
  { id: "motion", label: "Motion", spriteOnly: true },
  { id: "geometry", label: "Geometry" },
  { id: "style", label: "Style" },
  { id: "export", label: "Export" },
  { id: "info", label: "Info" },
];

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeFromPath(location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = useCallback((next: Route) => {
    history.pushState(null, "", next === "about" ? "/about" : "/");
    setRoute(next);
  }, []);

  const studio = useStudioState();
  const { settings: s, imageOptions, spriteConfig, animation } = studio;
  const preset = PRESETS[s.stylePreset];
  const caps = QUALITY_CAPS[s.quality];

  const [panelTab, setPanelTab] = useState<PanelTab>("create");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveFrame, setLiveFrame] = useState(0);
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [sheetBitmap, setSheetBitmap] = useState<ImageBitmap | null>(null);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);

  const say = useCallback((msg: string) => setToast(msg), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Assets ----------------------------------------------------------
  const promptMotif = useMemo<MotifAsset>(() => {
    const family = familyFromPrompt(s.prompt);
    return {
      kind: "procedural",
      family,
      variants: buildProceduralVariants(family, `${s.seed}:${s.prompt}`, preset),
    };
  }, [s.prompt, s.seed, preset]);

  const imageMotif = useMemo<MotifAsset | null>(() => {
    if (!imageBitmap) return null;
    return createMotifFromImage(imageBitmap, imageOptions, preset);
  }, [imageBitmap, imageOptions, preset]);

  const frames = useMemo(() => {
    if (!sheetBitmap) return [];
    return sliceSpriteSheet(sheetBitmap, spriteConfig);
  }, [sheetBitmap, spriteConfig]);

  const activeMotif =
    s.inputMode === "prompt" ? promptMotif : s.inputMode === "image" ? imageMotif : null;

  // ---- Geometry --------------------------------------------------------
  const basePlacements = useMemo(
    () =>
      generateTessellation({
        symmetry: s.symmetry,
        ringCount: s.ringCount,
        density: s.density,
        edgeCompression: s.edgeCompression,
        motifScale: s.motifScale,
        spiralOffset: s.spiralOffset,
        mirrorAlternates: s.mirrorAlternates,
        rotationMode: s.rotationMode,
        centerMotif: s.centerMotif,
        centerVoid: s.centerVoid,
        seed: s.seed,
        maxPlacements: caps.placements,
      }),
    [
      s.symmetry,
      s.ringCount,
      s.density,
      s.edgeCompression,
      s.motifScale,
      s.spiralOffset,
      s.mirrorAlternates,
      s.rotationMode,
      s.centerMotif,
      s.centerVoid,
      s.seed,
      caps.placements,
    ],
  );

  const lens = useMemo(() => {
    if (s.lensStrength <= 0) return null;
    const rad = (s.lensAngle * Math.PI) / 180;
    return { ax: Math.cos(rad) * s.lensStrength, ay: Math.sin(rad) * s.lensStrength };
  }, [s.lensStrength, s.lensAngle]);

  const placements = useMemo(
    () => (lens ? applyLens(basePlacements, lens.ax, lens.ay) : basePlacements),
    [basePlacements, lens],
  );

  const baseRingRadii = useMemo(
    () => [...new Set(basePlacements.map((p) => p.radius))],
    [basePlacements],
  );

  // ---- Scene -----------------------------------------------------------
  const buildScene = useCallback(
    (animFrames: number): RenderScene => ({
      placements,
      preset,
      motif: s.inputMode === "spritesheet" ? null : activeMotif,
      sprite:
        s.inputMode === "spritesheet" && frames.length > 0
          ? {
              frames,
              placementMode: animation.placementMode,
              mapContext: {
                ringCount: s.ringCount,
                symmetry: s.symmetry,
                direction: animation.direction,
              },
              animFrames,
              onionSkinCount: animation.onionSkinCount,
              onionSkinOpacity: animation.onionSkinOpacity,
              frameScale: animation.frameScale,
              frameRotation: (animation.frameRotation * Math.PI) / 180,
            }
          : null,
      showGuides: s.showGuides,
      guideOpacity: s.guideOpacity,
      boundaryStroke: s.boundaryStroke,
      symmetry: s.symmetry,
      baseRingRadii,
      lens,
    }),
    [placements, preset, activeMotif, frames, s, animation, baseRingRadii, lens],
  );

  // ---- File handlers ----------------------------------------------------
  const handleImageFile = useCallback(
    async (file: File) => {
      say("Extracting motif…");
      try {
        setImageBitmap(await loadImageFile(file));
      } catch {
        say("Could not read that image.");
      }
    },
    [say],
  );

  const handleSheetFile = useCallback(
    async (file: File) => {
      say("Mapping frames into disk…");
      try {
        setSheetBitmap(await loadImageFile(file));
        setActiveDemoId(null);
        studio.updateAnimation({ scrubFrame: 0, playing: false });
      } catch {
        say("Could not read that sprite sheet.");
      }
    },
    [say, studio],
  );

  const applyDemo = useCallback(
    async (demo: DemoSheet, announce: boolean, autoplay: boolean) => {
      try {
        const bitmap = await loadDemoBitmap(demo);
        setSheetBitmap(bitmap);
        setActiveDemoId(demo.id);
        studio.updateSpriteConfig({ rows: demo.rows, columns: demo.columns });
        studio.updateAnimation({
          placementMode: demo.placementMode,
          scrubFrame: 0,
          playing: autoplay,
        });
        if (announce) say("Mapping frames into disk…");
      } catch {
        if (announce) say("Could not load that demo sheet.");
      }
    },
    [say, studio],
  );

  const handleSelectDemo = useCallback(
    (demo: DemoSheet) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      void applyDemo(demo, true, !reduced);
    },
    [applyDemo],
  );

  // Open the app on a live starling tessellation so the strongest feature is
  // visible with zero clicks. Runs once; upload/selection cancels the intent.
  const didAutoloadRef = useRef(false);
  useEffect(() => {
    if (didAutoloadRef.current) return;
    didAutoloadRef.current = true;
    const demo = DEMO_SHEETS.find((d) => d.id === DEFAULT_DEMO_ID);
    if (!demo) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void applyDemo(demo, false, !reduced);
  }, [applyDemo]);

  // ---- Export handlers ---------------------------------------------------
  const currentAnimOffset = animation.playing ? liveFrame : animation.scrubFrame;

  // Programmatic / AI-drivable control surface: installs window.circleLimit and
  // answers postMessage. Additive — the UI is unchanged whether or not it's used.
  useCircleLimitBridge({
    studio,
    buildScene,
    currentOffset: currentAnimOffset,
    exportSize: caps.exportSize,
    frameCount: s.inputMode === "spritesheet" ? frames.length : 0,
    placementCount: placements.length,
    selectDemo: handleSelectDemo,
  });

  const handleExportPNG = useCallback(
    async (transparent: boolean) => {
      setBusy(true);
      say("Compressing edge geometry…");
      try {
        const blob = await exportScenePNG(
          buildScene(currentAnimOffset),
          caps.exportSize,
          transparent,
        );
        downloadBlob(blob, `circlelimit-${s.seed}${transparent ? "-alpha" : ""}.png`);
        say("PNG exported.");
      } catch {
        say("Export failed.");
      } finally {
        setBusy(false);
      }
    },
    [buildScene, currentAnimOffset, caps.exportSize, s.seed, say],
  );

  const handleExportSequence = useCallback(async () => {
    if (frames.length === 0) return;
    setBusy(true);
    say("Rendering motion manuscript…");
    try {
      const count = Math.min(frames.length, 48);
      const blobs = await exportAnimationFrames(
        buildScene(0),
        count,
        Math.min(caps.exportSize, 2048),
        false,
      );
      await downloadFrameSequence(blobs, `circlelimit-${s.seed}`);
      say(`${blobs.length} frames exported.`);
    } catch {
      say("Sequence export failed.");
    } finally {
      setBusy(false);
    }
  }, [frames.length, buildScene, caps.exportSize, s.seed, say]);

  const handleExportGIF = useCallback(async () => {
    if (frames.length === 0) return;
    setBusy(true);
    say("Rendering motion manuscript…");
    try {
      const blob = await exportAnimationGIF(
        buildScene(0),
        frames.length,
        Math.min(caps.exportSize, 1024),
        animation.fps,
        animation.pingPong,
      );
      downloadBlob(blob, `circlelimit-${s.seed}.gif`);
      say("GIF exported.");
    } catch {
      say("GIF export failed.");
    } finally {
      setBusy(false);
    }
  }, [frames.length, buildScene, caps.exportSize, animation.fps, animation.pingPong, s.seed, say]);

  const handleExportVideo = useCallback(async () => {
    if (frames.length === 0) return;
    setBusy(true);
    say("Recording animation…");
    try {
      const { blob, extension } = await exportAnimationVideo(
        buildScene(0),
        frames.length,
        Math.min(caps.exportSize, 2048),
        animation.fps,
        animation.pingPong,
      );
      downloadBlob(blob, `circlelimit-${s.seed}.${extension}`);
      say(`Video exported (${extension.toUpperCase()}).`);
    } catch (err) {
      say(err instanceof Error ? err.message : "Video export failed.");
    } finally {
      setBusy(false);
    }
  }, [frames.length, buildScene, caps.exportSize, animation.fps, animation.pingPong, s.seed, say]);

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([studio.exportSettings()], { type: "application/json" });
    downloadBlob(blob, `circlelimit-${s.seed}.json`);
    say("Settings exported.");
  }, [studio, s.seed, say]);

  const handleImportJSON = useCallback(
    async (file: File) => {
      const ok = studio.importSettings(await file.text());
      say(ok ? "Settings imported." : "Invalid settings file.");
    },
    [studio, say],
  );

  const spriteMode = s.inputMode === "spritesheet";

  // Leaving sprite mode while the mobile Motion tab is active strands the tab.
  useEffect(() => {
    if (!spriteMode && panelTab === "motion") setPanelTab("create");
  }, [spriteMode, panelTab]);

  const visibleTabs = PANEL_TABS.filter((t) => !t.spriteOnly || spriteMode);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>
          CircleLimit <span>Studio</span>
        </h1>
        <p className="tagline">
          Create infinite circular tessellations from prompts, images, and motion.
        </p>
        <nav className="top-nav" aria-label="Site">
          <button
            className={route === "studio" ? "active" : ""}
            aria-current={route === "studio" ? "page" : undefined}
            onClick={() => navigate("studio")}
          >
            Studio
          </button>
          <button
            className={route === "about" ? "active" : ""}
            aria-current={route === "about" ? "page" : undefined}
            onClick={() => navigate("about")}
          >
            About
          </button>
          {route === "studio" && (
            <button
              className="inspector-toggle"
              aria-expanded={inspectorOpen}
              onClick={() => setInspectorOpen((v) => !v)}
            >
              Inspector
            </button>
          )}
        </nav>
      </header>

      {route === "about" && <AboutPage onOpenStudio={() => navigate("studio")} />}

      <div
        className="studio-grid"
        hidden={route !== "studio"}
        data-tab={panelTab}
        data-inspector={inspectorOpen ? "open" : "closed"}
      >
        <main className="center-panel" style={{ background: preset.background }}>
          <CircleLimitCanvas
            buildScene={buildScene}
            frameCount={spriteMode ? frames.length : 0}
            animation={animation}
            onPause={(atFrame) =>
              studio.updateAnimation({ playing: false, scrubFrame: atFrame })
            }
            onLiveFrame={setLiveFrame}
          />
          {spriteMode && frames.length > 1 && (
            <PlaybackBar studio={studio} frameCount={frames.length} liveFrame={liveFrame} />
          )}
        </main>

        <nav className="panel-tabbar" aria-label="Control sections">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              className={panelTab === t.id ? "active" : ""}
              aria-current={panelTab === t.id ? "true" : undefined}
              onClick={() => setPanelTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="left-panel" role="region" aria-label="Inputs and controls">
          <div className="panel-group" data-group="create">
            <InputModeTabs studio={studio} />
            {s.inputMode === "prompt" && (
              <PromptInputPanel
                studio={studio}
                onGenerate={() => {
                  studio.randomizeSeed();
                  say("Approaching infinity…");
                }}
              />
            )}
            {s.inputMode === "image" && (
              <ImageUploadPanel
                studio={studio}
                onFile={handleImageFile}
                hasImage={imageBitmap !== null}
              />
            )}
            {spriteMode && (
              <SpriteSheetUploadPanel
                studio={studio}
                onFile={handleSheetFile}
                onSelectDemo={handleSelectDemo}
                activeDemoId={activeDemoId}
                hasSheet={sheetBitmap !== null}
                frameCount={frames.length}
              />
            )}
          </div>
          {spriteMode && (
            <div className="panel-group" data-group="motion">
              <SpriteControls studio={studio} />
            </div>
          )}
          <div className="panel-group" data-group="geometry">
            <GeometryControls studio={studio} />
          </div>
          <div className="panel-group" data-group="style">
            <StyleControls studio={studio} />
          </div>
          <div className="panel-group" data-group="export">
            <ExportControls
              studio={studio}
              onExportPNG={handleExportPNG}
              onExportSequence={handleExportSequence}
              onExportGIF={handleExportGIF}
              onExportVideo={handleExportVideo}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSON}
              busy={busy}
            />
          </div>
        </div>

        <div className="inspector-wrap" data-group="info">
          <InspectorPanel
            studio={studio}
            motif={activeMotif}
            frames={frames}
            placementCount={placements.length}
            caps={caps}
          />
        </div>
        <button
          className="inspector-backdrop"
          aria-label="Close inspector"
          tabIndex={inspectorOpen ? 0 : -1}
          onClick={() => setInspectorOpen(false)}
        />
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
