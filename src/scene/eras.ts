import type { SceneModel } from "./model";

/**
 * Scenes of eras II to V, on the same 192 × 108 pixel canvas as the era I room.
 * II: a datacenter aisle. III: a neural network. IV: the Earth filling up with machines.
 * V: almost nothing — the Earth, dim, and one person standing on it.
 * The Earth is the 2D version of the 3D globe of the cahier (§13): it is always available.
 */

const W = 192;
const H = 108;

export const ERA_PALETTES = {
  2: { bg: "#0a1214", raised: "#111d20", line: "#1f3a38", dim: "#4fb595", main: "#6ff0c4", hot: "#d9fff2" },
  3: { bg: "#0b0b16", raised: "#14142a", line: "#2a2a50", dim: "#7f8de0", main: "#a9b8ff", hot: "#ffffff" },
  4: { bg: "#050505", raised: "#101010", line: "#2a2a2a", dim: "#9a9a9a", main: "#f0f0f0", hot: "#ff5a3c" },
  5: { bg: "#f4f2ee", raised: "#ebe8e2", line: "#d4cfc6", dim: "#8a857d", main: "#1c1b19", hot: "#1c1b19" },
} as const;

type Palette = (typeof ERA_PALETTES)[keyof typeof ERA_PALETTES];

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function drawEraScene(ctx: CanvasRenderingContext2D, model: SceneModel, now: number): void {
  const era = Math.min(Math.max(model.era, 2), 5) as 2 | 3 | 4 | 5;
  const p = ERA_PALETTES[era];
  ctx.imageSmoothingEnabled = false;
  rect(ctx, p.bg, 0, 0, W, H);
  if (era === 2) drawDatacenter(ctx, model, p, now);
  else if (era === 3) drawNetwork(ctx, model, p, now);
  else drawEarth(ctx, model, p, now, era === 5);
}

function drawDatacenter(ctx: CanvasRenderingContext2D, model: SceneModel, p: Palette, now: number) {
  rect(ctx, p.raised, 0, 84, W, H - 84);
  rect(ctx, p.line, 0, 84, W, 1);
  // One rack per building of era II, two rows that recede.
  for (let i = 0; i < model.racks; i++) {
    const back = i % 2 === 1;
    const x = 8 + Math.floor(i / 2) * 18 + (back ? 6 : 0);
    const top = back ? 24 : 36;
    const height = back ? 52 : 48;
    rect(ctx, back ? p.line : p.raised, x, top, 14, height);
    rect(ctx, p.line, x, top, 14, 1);
    for (let u = 0; u < 7; u++) {
      const y = top + 4 + u * 6;
      rect(ctx, p.line, x + 2, y, 10, 3);
      const on = Math.floor(now / (140 + ((i * 7 + u) % 9) * 37)) % 3 !== 0;
      rect(ctx, on ? p.main : p.dim, x + 10, y + 1, 1, 1);
    }
  }
  // Scripts: a cursor that walks the aisle and buys on its own.
  if (model.scripts) {
    const x = 10 + ((now / 30) % (W - 20));
    rect(ctx, p.hot, x, 90, 3, 3);
    rect(ctx, p.dim, x - 6, 91, 5, 1);
  }
  // Industrial robot arm on the right.
  if (model.robotArm) {
    const swing = Math.sin(now / 500) * 6;
    rect(ctx, p.dim, 170, 76, 12, 8);
    rect(ctx, p.main, 175, 56, 2, 20);
    rect(ctx, p.main, 175 + swing / 2, 54, 10, 2);
    rect(ctx, p.hot, 184 + swing / 2, 53, 2, 4);
  }
}

function drawNetwork(ctx: CanvasRenderingContext2D, model: SceneModel, p: Palette, now: number) {
  const layers = [3, 5, 5, 3].map((n, i) => (i === 1 || i === 2 ? Math.min(3 + model.nodes, 7) : n));
  const points: Array<Array<[number, number]>> = layers.map((n, l) =>
    Array.from({ length: n }, (_, k) => [24 + l * 48, 14 + ((k + 0.5) * 80) / n] as [number, number]),
  );
  // Edges first, with a pulse travelling forward.
  for (let l = 0; l < points.length - 1; l++) {
    for (const a of points[l]) {
      for (const b of points[l + 1]) {
        ctx.strokeStyle = p.line;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
  }
  const t = (now / 1400) % 1;
  for (let l = 0; l < points.length - 1; l++) {
    points[l].forEach((a, k) => {
      const b = points[l + 1][(k * 2 + l) % points[l + 1].length];
      rect(ctx, p.hot, a[0] + (b[0] - a[0]) * t - 1, a[1] + (b[1] - a[1]) * t - 1, 2, 2);
    });
  }
  points.flat().forEach(([x, y], i) => {
    const lit = Math.floor(now / 300 + i) % 4 === 0;
    rect(ctx, lit ? p.main : p.dim, x - 2, y - 2, 5, 5);
  });
  // A training run in progress shows as a loading bar.
  if (model.training) {
    rect(ctx, p.line, 48, 100, 96, 3);
    rect(ctx, p.main, 48, 100, Math.round(96 * ((now / 4000) % 1)), 3);
  }
}

function drawEarth(ctx: CanvasRenderingContext2D, model: SceneModel, p: Palette, now: number, last: boolean) {
  const cx = W / 2;
  const cy = last ? 70 : H / 2;
  const r = last ? 30 : 40;
  ctx.fillStyle = p.raised;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.line;
  ctx.stroke();
  // Machine density: dots on the globe, from none to full at 7 billion. The globe turns slowly.
  const dots = Math.round(model.density * 420);
  const spin = (now / 9000) % (Math.PI * 2);
  for (let i = 0; i < dots; i++) {
    const lat = Math.asin(((i * 0.618034) % 1) * 2 - 1);
    const lon = (i * 2.399963 + spin) % (Math.PI * 2);
    const z = Math.cos(lat) * Math.cos(lon);
    if (z < 0) continue; // far side
    const x = cx + r * Math.cos(lat) * Math.sin(lon);
    const y = cy - r * Math.sin(lat);
    rect(ctx, i % 11 === 0 ? p.hot : p.main, x, y, 1, 1);
  }
  if (last) {
    // The last human, standing on top of the world.
    rect(ctx, p.main, cx, cy - r - 7, 2, 2);
    rect(ctx, p.main, cx, cy - r - 5, 2, 5);
  }
}
