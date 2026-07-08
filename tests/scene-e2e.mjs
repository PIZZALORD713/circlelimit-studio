/**
 * End-to-end test for scene share links (M1 of PHASE2.md).
 *
 * Builds nothing itself — run `npm run build` first, then `npm run test:scenes`.
 * Spawns `vite preview`, drives headless Chromium through the window.circleLimit
 * bridge, and verifies: live #s= hash, cold-load restore, byte-identical PNG
 * reproduction, bridge scene methods, and malformed-hash fallback.
 *
 * Chromium resolution order: CHROMIUM_PATH env var, playwright-core's
 * registry (respects PLAYWRIGHT_BROWSERS_PATH), /opt/pw-browsers/chromium.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    (() => {
      try {
        return chromium.executablePath();
      } catch {
        return undefined;
      }
    })(),
    "/opt/pw-browsers/chromium", // pre-provisioned environments
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) {
    throw new Error(
      "No Chromium found. Set CHROMIUM_PATH or run `npx playwright-core install chromium`.",
    );
  }
  return found;
}

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;

async function waitForServer(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`preview server never came up at ${url}`);
}

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
  detached: true,
});
const stopServer = () => {
  try {
    process.kill(-server.pid);
  } catch {
    /* already gone */
  }
};
process.on("exit", stopServer);

await waitForServer(BASE);

const browser = await chromium.launch({ executablePath: findChromium() });
const fails = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) fails.push(name);
};
const bridgeReady = (p) =>
  p.waitForFunction(() => window.circleLimit?.getFrameCount() > 0, null, { timeout: 15000 });

// ---- 1. Fresh boot: default demo loads, bridge is present ------------------
const page = await browser.newPage();
await page.goto(BASE);
await bridgeReady(page);
check("boot: default demo loaded", true);

// ---- 2. Patch a distinctive scene, wait for the live hash ------------------
const applied = await page.evaluate(() =>
  window.circleLimit.patch({
    symmetry: 6,
    stylePreset: "stained-glass-swarm",
    lensStrength: 0.45,
    spiralOffset: 0.18,
    density: 2.0,
    placementMode: "spiral-motion",
    seed: "e2e-test",
  }),
);
check("patch applied all keys", applied.length === 7, JSON.stringify(applied));

await page.waitForFunction(() => location.hash.startsWith("#s="), null, { timeout: 5000 });
const hash = await page.evaluate(() => location.hash);
check("live hash written and short", hash.startsWith("#s=") && hash.length < 300, `${hash.length} chars`);

// ---- 3. Bridge scene methods ------------------------------------------------
const scene = await page.evaluate(() => window.circleLimit.getScene());
check(
  "getScene: diff-only patch with demo ref",
  scene.v === 2 && scene.patch.symmetry === 6 && scene.demo === "flight",
);
check("getScene: defaults omitted", !("ringCount" in scene.patch) && !("fps" in scene.patch));
const sceneURL = await page.evaluate(() => window.circleLimit.getSceneURL());
check("getSceneURL returns share URL", sceneURL.includes("#s="));

// ---- 4. Cold load of the share URL in a new page ----------------------------
const page2 = await browser.newPage();
await page2.goto(sceneURL);
await bridgeReady(page2);
await page2.waitForFunction(() => window.circleLimit.get("seed") === "e2e-test", null, {
  timeout: 5000,
});
const restored = await page2.evaluate(() => {
  const cl = window.circleLimit;
  return {
    symmetry: cl.get("symmetry"),
    stylePreset: cl.get("stylePreset"),
    lensStrength: cl.get("lensStrength"),
    spiralOffset: cl.get("spiralOffset"),
    density: cl.get("density"),
    placementMode: cl.get("placementMode"),
    frameCount: cl.getFrameCount(),
  };
});
check(
  "cold load restores full scene + demo sheet",
  restored.symmetry === 6 &&
    restored.stylePreset === "stained-glass-swarm" &&
    restored.lensStrength === 0.45 &&
    restored.spiralOffset === 0.18 &&
    restored.density === 2 &&
    restored.placementMode === "spiral-motion" &&
    restored.frameCount === 8,
  JSON.stringify(restored),
);

// ---- 5. Pixel-exact reproduction ---------------------------------------------
const pngOf = (p) =>
  p.evaluate(async () => {
    window.circleLimit.setFrame(3);
    await new Promise((r) => setTimeout(r, 300));
    return window.circleLimit.exportPNG({ size: 512 });
  });
const [pngA, pngB] = [await pngOf(page), await pngOf(page2)];
check("pixel-exact across browser contexts", pngA === pngB, `${pngA.length} chars (dataURL)`);

// ---- 6. loadScene round-trip on a live studio ---------------------------------
const okLoad = await page2.evaluate(async () => {
  const cl = window.circleLimit;
  cl.patch({ seed: "divergence", symmetry: 12 });
  await new Promise((r) => setTimeout(r, 100));
  const url = await cl.getSceneURL();
  cl.patch({ seed: "other", symmetry: 3 });
  await new Promise((r) => setTimeout(r, 100));
  const ok = await cl.loadScene(url);
  await new Promise((r) => setTimeout(r, 100));
  return ok && cl.get("seed") === "divergence" && cl.get("symmetry") === 12;
});
check("bridge loadScene(url) restores", okLoad);

// ---- 7. Malformed hash fails safe ----------------------------------------------
const page3 = await browser.newPage();
await page3.goto(BASE + "#s=Znotavalidpayload!!!");
await bridgeReady(page3);
const seedAfterBad = await page3.evaluate(() => window.circleLimit.get("seed"));
check("malformed hash falls back to defaults", seedAfterBad === "murmuration", seedAfterBad);

await browser.close();
stopServer();
console.log(fails.length === 0 ? "\nALL PASS" : `\n${fails.length} FAILURES: ${fails.join(", ")}`);
process.exit(fails.length === 0 ? 0 : 1);
