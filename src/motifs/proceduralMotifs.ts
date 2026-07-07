import type { MotifFamily, MotifStyle } from "./motifTypes";
import { rngFromSeed, type Rng } from "../utils/random";
import type { PresetDef } from "../styles/presets";

/**
 * Procedural vector motifs drawn with canvas primitives — silhouettes with
 * interior detail lines, aiming for woodcut / mathematical print energy rather
 * than clip-art. Each drawer renders centered at (0,0) inside a box of
 * [-S/2, S/2] where S = 100 (callers scale the context).
 */

const S = 100;

type Drawer = (ctx: CanvasRenderingContext2D, style: MotifStyle, rng: Rng) => void;

function strokeAndFill(ctx: CanvasRenderingContext2D, style: MotifStyle, path: Path2D) {
  ctx.fillStyle = style.fill;
  ctx.fill(path);
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2.4 * style.outlineWeight;
  ctx.lineJoin = "round";
  ctx.stroke(path);
}

function detailStroke(ctx: CanvasRenderingContext2D, style: MotifStyle, width = 1.4) {
  ctx.strokeStyle = style.detail;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
}

const drawFish: Drawer = (ctx, style, rng) => {
  const tailFork = 10 + rng() * 8;
  const body = new Path2D();
  body.moveTo(-42, 0);
  body.bezierCurveTo(-30, -22, 8, -26, 34, -6);
  body.lineTo(46, -tailFork);
  body.quadraticCurveTo(38, 0, 46, tailFork);
  body.lineTo(34, 6);
  body.bezierCurveTo(8, 26, -30, 22, -42, 0);
  body.closePath();
  strokeAndFill(ctx, style, body);

  // Dorsal + belly fins
  const fin = new Path2D();
  fin.moveTo(-6, -20);
  fin.quadraticCurveTo(2, -34, 14, -22);
  fin.moveTo(-6, 20);
  fin.quadraticCurveTo(2, 34, 14, 22);
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2.2 * style.outlineWeight;
  ctx.stroke(fin);

  // Eye
  ctx.fillStyle = style.detail;
  ctx.beginPath();
  ctx.arc(-30, -4, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.outline;
  ctx.beginPath();
  ctx.arc(-30, -4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Gill + body stripes
  detailStroke(ctx, style);
  ctx.beginPath();
  ctx.moveTo(-22, -12);
  ctx.quadraticCurveTo(-18, 0, -22, 12);
  for (let i = 0; i < 3; i++) {
    const x = -8 + i * 11;
    ctx.moveTo(x, -14 + i * 2);
    ctx.quadraticCurveTo(x + 4, 0, x, 14 - i * 2);
  }
  ctx.stroke();
};

const drawBird: Drawer = (ctx, style, rng) => {
  const sweep = 6 + rng() * 8;
  const body = new Path2D();
  // Swallow-like silhouette flying along +x
  body.moveTo(44, 0); // beak
  body.lineTo(30, -5);
  body.bezierCurveTo(20, -10, 4, -8, -8, -4); // back
  // Upper wing
  body.lineTo(-2, -10);
  body.quadraticCurveTo(-16 - sweep, -34, -34, -26);
  body.quadraticCurveTo(-20, -18, -12, -6);
  // Tail fork
  body.lineTo(-30, -4);
  body.lineTo(-44, -8);
  body.lineTo(-32, 2);
  body.lineTo(-44, 10);
  body.lineTo(-28, 6);
  // Lower wing
  body.quadraticCurveTo(-18, 16, -26 - sweep, 30);
  body.quadraticCurveTo(-8, 26, 0, 10);
  body.bezierCurveTo(14, 10, 26, 6, 30, 4);
  body.closePath();
  strokeAndFill(ctx, style, body);

  // Eye
  ctx.fillStyle = style.detail;
  ctx.beginPath();
  ctx.arc(30, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Feather lines
  detailStroke(ctx, style);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(-8 - i * 7, -8 - i * 6);
    ctx.quadraticCurveTo(-18 - i * 7, -16 - i * 5, -28 - i * 6, -20 - i * 3);
  }
  ctx.moveTo(4, 8);
  ctx.quadraticCurveTo(-8, 18, -18, 24);
  ctx.stroke();
};

const drawButterfly: Drawer = (ctx, style, rng) => {
  const lobe = 4 + rng() * 6;
  const wings = new Path2D();
  // Upper wings
  wings.moveTo(0, -6);
  wings.bezierCurveTo(-14, -34, -40, -34 - lobe, -38, -12);
  wings.bezierCurveTo(-36, 2, -14, 4, 0, 0);
  wings.moveTo(0, -6);
  wings.bezierCurveTo(14, -34, 40, -34 - lobe, 38, -12);
  wings.bezierCurveTo(36, 2, 14, 4, 0, 0);
  // Lower wings
  wings.moveTo(0, 2);
  wings.bezierCurveTo(-12, 6, -30, 10, -26, 26);
  wings.bezierCurveTo(-22, 38, -6, 30, 0, 12);
  wings.moveTo(0, 2);
  wings.bezierCurveTo(12, 6, 30, 10, 26, 26);
  wings.bezierCurveTo(22, 38, 6, 30, 0, 12);
  strokeAndFill(ctx, style, wings);

  // Body + antennae
  ctx.fillStyle = style.outline;
  ctx.beginPath();
  ctx.ellipse(0, 2, 3.4, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 1.6 * style.outlineWeight;
  ctx.beginPath();
  ctx.moveTo(-1, -13);
  ctx.quadraticCurveTo(-8, -26, -14, -30);
  ctx.moveTo(1, -13);
  ctx.quadraticCurveTo(8, -26, 14, -30);
  ctx.stroke();

  // Wing spots
  ctx.fillStyle = style.detail;
  for (const [x, y, r] of [
    [-24, -18, 4.5],
    [24, -18, 4.5],
    [-17, 22, 3],
    [17, 22, 3],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawBat: Drawer = (ctx, style, rng) => {
  const scallop = 6 + rng() * 5;
  const shape = new Path2D();
  shape.moveTo(0, -14);
  // Left wing with scalloped trailing edge
  shape.quadraticCurveTo(-20, -26, -44, -18);
  shape.quadraticCurveTo(-38, -6, -40, 8);
  shape.quadraticCurveTo(-30, 2, -24, scallop);
  shape.quadraticCurveTo(-16, 2, -10, scallop + 4);
  shape.quadraticCurveTo(-4, 8, 0, 18);
  // Right wing mirrored
  shape.quadraticCurveTo(4, 8, 10, scallop + 4);
  shape.quadraticCurveTo(16, 2, 24, scallop);
  shape.quadraticCurveTo(30, 2, 40, 8);
  shape.quadraticCurveTo(38, -6, 44, -18);
  shape.quadraticCurveTo(20, -26, 0, -14);
  shape.closePath();
  strokeAndFill(ctx, style, shape);

  // Ears
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2 * style.outlineWeight;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.lineTo(-9, -26);
  ctx.lineTo(-1, -18);
  ctx.moveTo(6, -14);
  ctx.lineTo(9, -26);
  ctx.lineTo(1, -18);
  ctx.fill();
  ctx.stroke();

  // Eyes + wing bones
  ctx.fillStyle = style.detail;
  ctx.beginPath();
  ctx.arc(-4, -10, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -10, 1.8, 0, Math.PI * 2);
  ctx.fill();
  detailStroke(ctx, style);
  ctx.beginPath();
  for (const dir of [-1, 1]) {
    ctx.moveTo(dir * 6, -8);
    ctx.quadraticCurveTo(dir * 20, -12, dir * 36, -12);
    ctx.moveTo(dir * 6, -6);
    ctx.quadraticCurveTo(dir * 16, -2, dir * 22, 4);
  }
  ctx.stroke();
};

const drawAngel: Drawer = (ctx, style, rng) => {
  const flare = 8 + rng() * 6;
  const robe = new Path2D();
  robe.moveTo(0, -22);
  robe.quadraticCurveTo(10, -14, 12 + flare / 2, 12);
  robe.quadraticCurveTo(14, 30, 10, 34);
  robe.lineTo(-10, 34);
  robe.quadraticCurveTo(-14, 30, -12 - flare / 2, 12);
  robe.quadraticCurveTo(-10, -14, 0, -22);
  robe.closePath();

  const wings = new Path2D();
  wings.moveTo(-8, -10);
  wings.quadraticCurveTo(-30, -28, -38, -8);
  wings.quadraticCurveTo(-30, -4, -22, 6);
  wings.quadraticCurveTo(-14, 0, -8, -2);
  wings.moveTo(8, -10);
  wings.quadraticCurveTo(30, -28, 38, -8);
  wings.quadraticCurveTo(30, -4, 22, 6);
  wings.quadraticCurveTo(14, 0, 8, -2);
  strokeAndFill(ctx, style, wings);
  strokeAndFill(ctx, style, robe);

  // Head + halo
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2 * style.outlineWeight;
  ctx.beginPath();
  ctx.arc(0, -28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = style.detail;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, -36, 9, 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Robe folds + feathers
  detailStroke(ctx, style);
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(i * 5, -8);
    ctx.quadraticCurveTo(i * 7, 12, i * 8, 32);
  }
  for (const dir of [-1, 1]) {
    ctx.moveTo(dir * 12, -8);
    ctx.quadraticCurveTo(dir * 22, -14, dir * 30, -10);
  }
  ctx.stroke();
};

const drawFlower: Drawer = (ctx, style, rng) => {
  const petals = 5 + Math.floor(rng() * 3);
  const petal = new Path2D();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const px = (x: number, y: number) => [x * cos - y * sin, x * sin + y * cos] as const;
    const [tx, ty] = px(38, 0);
    const [c1x, c1y] = px(14, -14);
    const [c2x, c2y] = px(30, -12);
    const [c3x, c3y] = px(30, 12);
    const [c4x, c4y] = px(14, 14);
    petal.moveTo(...px(8, 0));
    petal.bezierCurveTo(c1x, c1y, c2x, c2y, tx, ty);
    petal.bezierCurveTo(c3x, c3y, c4x, c4y, ...px(8, 0));
  }
  strokeAndFill(ctx, style, petal);

  // Center disk
  ctx.fillStyle = style.detail;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2 * style.outlineWeight;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Petal veins
  detailStroke(ctx, style);
  ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
  }
  ctx.stroke();
};

const drawMask: Drawer = (ctx, style, rng) => {
  const jaw = 30 + rng() * 8;
  const face = new Path2D();
  face.moveTo(0, -34);
  face.bezierCurveTo(22, -34, 28, -14, 24, 4);
  face.bezierCurveTo(20, 22, 12, jaw, 0, jaw + 4);
  face.bezierCurveTo(-12, jaw, -20, 22, -24, 4);
  face.bezierCurveTo(-28, -14, -22, -34, 0, -34);
  face.closePath();
  strokeAndFill(ctx, style, face);

  // Eye holes
  ctx.fillStyle = style.detail;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(dir * 10, -8, 6.5, 4, dir * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mouth
  ctx.beginPath();
  ctx.ellipse(0, 18, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brow + cheek markings
  detailStroke(ctx, style, 1.8);
  ctx.beginPath();
  ctx.moveTo(-18, -18);
  ctx.quadraticCurveTo(0, -26, 18, -18);
  for (const dir of [-1, 1]) {
    ctx.moveTo(dir * 16, 4);
    ctx.quadraticCurveTo(dir * 12, 10, dir * 14, 16);
  }
  ctx.stroke();
};

const drawCreature: Drawer = (ctx, style, rng) => {
  const hornTilt = rng() * 8;
  const body = new Path2D();
  // Interlock-friendly lizard-imp silhouette
  body.moveTo(-40, 4); // tail tip
  body.quadraticCurveTo(-24, -6, -12, -4);
  body.quadraticCurveTo(-10, -18, 2, -20); // shoulder to head
  body.quadraticCurveTo(16, -22, 22, -12);
  body.lineTo(34, -14 - hornTilt); // horn
  body.lineTo(28, -4);
  body.quadraticCurveTo(30, 6, 20, 10);
  body.lineTo(26, 20); // front leg
  body.lineTo(16, 16);
  body.quadraticCurveTo(4, 20, -6, 14);
  body.lineTo(-4, 24); // back leg
  body.lineTo(-14, 16);
  body.quadraticCurveTo(-28, 14, -40, 4);
  body.closePath();
  strokeAndFill(ctx, style, body);

  // Eye
  ctx.fillStyle = style.detail;
  ctx.beginPath();
  ctx.arc(14, -12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.outline;
  ctx.beginPath();
  ctx.arc(14, -12, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Spine ridges + belly stripes
  detailStroke(ctx, style);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x = -8 + i * 8;
    ctx.moveTo(x, -14 + i);
    ctx.lineTo(x + 3, -20 + i);
  }
  for (let i = 0; i < 3; i++) {
    const x = -18 + i * 10;
    ctx.moveTo(x, 8);
    ctx.quadraticCurveTo(x + 3, 12, x + 6, 10);
  }
  ctx.stroke();
};

const drawShard: Drawer = (ctx, style, rng) => {
  const points = 5 + Math.floor(rng() * 3);
  const shape = new Path2D();
  const radii: number[] = [];
  for (let i = 0; i < points; i++) {
    radii.push(24 + rng() * 18);
  }
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    const r = radii[i % points];
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  strokeAndFill(ctx, style, shape);

  // Facet lines to a slightly off-center focus
  const fx = (rng() - 0.5) * 10;
  const fy = (rng() - 0.5) * 10;
  detailStroke(ctx, style);
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    const r = radii[i];
    ctx.moveTo(fx, fy);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
};

const DRAWERS: Record<MotifFamily, Drawer> = {
  fish: drawFish,
  bird: drawBird,
  butterfly: drawButterfly,
  bat: drawBat,
  angel: drawAngel,
  flower: drawFlower,
  mask: drawMask,
  creature: drawCreature,
  shard: drawShard,
};

export function drawMotif(
  ctx: CanvasRenderingContext2D,
  family: MotifFamily,
  style: MotifStyle,
  seed: string,
): void {
  const rng = rngFromSeed(`${seed}:${family}`);
  DRAWERS[family](ctx, style, rng);
}

const VARIANT_SIZE = 256;

/**
 * Pre-render one canvas per palette color so the hot render loop is pure
 * drawImage stamping.
 */
export function buildProceduralVariants(
  family: MotifFamily,
  seed: string,
  preset: PresetDef,
): HTMLCanvasElement[] {
  return preset.palette.map((fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = VARIANT_SIZE;
    canvas.height = VARIANT_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(VARIANT_SIZE / 2, VARIANT_SIZE / 2);
    ctx.scale(VARIANT_SIZE / (S - 4), VARIANT_SIZE / (S - 4));
    drawMotif(
      ctx,
      family,
      {
        fill,
        outline: preset.outline,
        detail: preset.detail,
        outlineWeight: preset.outlineWeight,
      },
      seed,
    );
    return canvas;
  });
}
