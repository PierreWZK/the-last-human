import type { SceneModel } from "./model";

/**
 * Scenes of eras II to V, on the same 192 × 108 pixel canvas as the era I room.
 * Each era has a base set that is always drawn, so a fresh era (no building yet, right after a
 * renaissance) never shows an empty canvas; buildings then fill it.
 * II: a supervision room, the human at a dashboard, rack slots that fill up.
 * III: a neural network, the human small at a terminal.
 * IV: the Earth among the stars, covered by machines up to 7 billion.
 * V: the same Earth, quiet and light, with one person standing on it.
 * The Earth is the 2D version of the 3D globe of the cahier (§13): it is always available.
 */

const W = 192;
const H = 108;
const FLOOR = 84;

export const ERA_PALETTES = {
  2: { bg: "#0a1214", raised: "#111d20", line: "#1f3a38", dim: "#4fb595", main: "#6ff0c4", hot: "#d9fff2", land: "#1f3a38" },
  3: { bg: "#0b0b16", raised: "#14142a", line: "#2a2a50", dim: "#7f8de0", main: "#a9b8ff", hot: "#ffffff", land: "#2a2a50" },
  4: { bg: "#050505", raised: "#101010", line: "#2a2a2a", dim: "#9a9a9a", main: "#f0f0f0", hot: "#ff5a3c", land: "#4a4a4a" },
  5: { bg: "#f4f2ee", raised: "#ebe8e2", line: "#d4cfc6", dim: "#8a857d", main: "#1c1b19", hot: "#1c1b19", land: "#b8b2a8" },
} as const;

type Palette = (typeof ERA_PALETTES)[keyof typeof ERA_PALETTES];

/** Rack slots of the era II room: two rows of six. */
export const RACK_SLOTS = 12;

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function drawEraScene(ctx: CanvasRenderingContext2D, model: SceneModel, now: number): void {
  const era = Math.min(Math.max(model.era, 2), 5) as 2 | 3 | 4 | 5;
  const p = ERA_PALETTES[era];
  ctx.imageSmoothingEnabled = false;
  rect(ctx, p.bg, 0, 0, W, H);
  if (era === 2) drawSupervision(ctx, model, p, now);
  else if (era === 3) drawNetwork(ctx, model, p, now);
  else drawEarth(ctx, model, p, now, era === 5);
}

/** The human, sitting, seen from the side. Arms move while `busy`. */
function drawPerson(ctx: CanvasRenderingContext2D, p: Palette, x: number, floor: number, busy: boolean, now: number) {
  rect(ctx, p.line, x - 2, floor - 16, 2, 16); // chair back
  rect(ctx, p.line, x - 2, floor - 7, 12, 2); // seat
  rect(ctx, p.main, x + 1, floor - 26, 5, 5); // head
  rect(ctx, p.dim, x, floor - 21, 6, 13); // torso
  rect(ctx, p.dim, x + 4, floor - 8, 8, 2); // thigh
  rect(ctx, p.dim, x + 10, floor - 6, 2, 6); // leg
  const frame = busy ? Math.floor(now / 90) % 2 : 0;
  rect(ctx, p.main, x + 5, floor - 17 - frame, 7, 2); // arm on the desk
}

function drawSupervision(ctx: CanvasRenderingContext2D, model: SceneModel, p: Palette, now: number) {
  rect(ctx, p.raised, 0, FLOOR, W, H - FLOOR);
  rect(ctx, p.line, 0, FLOOR, W, 1);
  // Grid on the wall: the room of the automation age.
  for (let x = 0; x < W; x += 12) rect(ctx, p.raised, x, 0, 1, FLOOR);
  for (let y = 8; y < FLOOR; y += 12) rect(ctx, p.raised, 0, y, W, 1);

  // The supervisor's desk and its two screens, with live graphs.
  rect(ctx, p.dim, 24, 64, 40, 2);
  rect(ctx, p.line, 26, 66, 2, FLOOR - 66);
  rect(ctx, p.line, 60, 66, 2, FLOOR - 66);
  for (const [sx, phase] of [[30, 0], [46, 2]] as const) {
    rect(ctx, p.line, sx, 46, 15, 12);
    rect(ctx, p.bg, sx + 1, 47, 13, 10);
    for (let k = 0; k < 6; k++) {
      const h = 2 + Math.round(3 + 3 * Math.sin(now / 700 + k + phase));
      rect(ctx, p.main, sx + 2 + k * 2, 56 - h, 1, h);
    }
    rect(ctx, p.line, sx + 6, 58, 3, 6);
  }
  drawPerson(ctx, p, 12, FLOOR, model.scripts === false, now);

  // Rack slots: empty ones are outlined, owned ones are full and blink.
  for (let i = 0; i < RACK_SLOTS; i++) {
    const back = i >= RACK_SLOTS / 2;
    const col = i % (RACK_SLOTS / 2);
    const x = 76 + col * 15 + (back ? 4 : 0);
    const top = back ? 22 : 34;
    const height = FLOOR - top - (back ? 8 : 0);
    if (i >= model.racks) {
      ctx.strokeStyle = p.line;
      ctx.strokeRect(x + 0.5, top + 0.5, 11, height - 1);
      continue;
    }
    rect(ctx, back ? p.line : p.raised, x, top, 12, height);
    rect(ctx, p.dim, x, top, 12, 1);
    for (let u = 0; u < 6; u++) {
      const y = top + 4 + u * 6;
      rect(ctx, back ? p.raised : p.line, x + 2, y, 8, 3);
      const on = Math.floor(now / (140 + ((i * 7 + u) % 9) * 37)) % 3 !== 0;
      rect(ctx, on ? p.main : p.dim, x + 9, y + 1, 1, 1);
    }
  }
  // Scripts: a cursor that walks the aisle and buys on its own.
  if (model.scripts) {
    const x = 70 + ((now / 30) % (W - 80));
    rect(ctx, p.hot, x, 92, 3, 3);
    rect(ctx, p.dim, x - 6, 93, 5, 1);
  }
  // Industrial robot arm, in front of the racks.
  if (model.robotArm) {
    const swing = Math.sin(now / 500) * 6;
    rect(ctx, p.dim, 172, FLOOR - 8, 14, 8);
    rect(ctx, p.main, 178, FLOOR - 28, 2, 20);
    rect(ctx, p.main, 178 + swing / 2 - 8, FLOOR - 30, 10, 2);
    rect(ctx, p.hot, 178 + swing / 2 - 9, FLOOR - 31, 2, 4);
  }
}

function drawNetwork(ctx: CanvasRenderingContext2D, model: SceneModel, p: Palette, now: number) {
  // The human, small, at a terminal on the left: the network is bigger than them now.
  rect(ctx, p.raised, 0, FLOOR, 54, H - FLOOR);
  rect(ctx, p.line, 0, FLOOR, 54, 1);
  rect(ctx, p.dim, 18, 66, 30, 2);
  rect(ctx, p.line, 30, 54, 13, 10);
  rect(ctx, p.bg, 31, 55, 11, 8);
  rect(ctx, p.main, 32, 57 + (Math.floor(now / 500) % 3) * 2, 6, 1);
  rect(ctx, p.line, 35, 64, 3, 2);
  drawPerson(ctx, p, 8, FLOOR, model.training, now);

  const layers = [3, Math.min(3 + model.nodes, 7), Math.min(3 + model.nodes, 7), 2];
  const points: Array<Array<[number, number]>> = layers.map((n, l) =>
    Array.from({ length: n }, (_, k) => [72 + l * 36, 10 + ((k + 0.5) * 84) / n] as [number, number]),
  );
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
  // Signals travel forward through the layers.
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
  // A training run in progress shows as a loading bar under the network.
  if (model.training) {
    rect(ctx, p.line, 72, 100, 108, 3);
    rect(ctx, p.main, 72, 100, Math.round(108 * ((now / 4000) % 1)), 3);
  }
}

/** Fixed stars and continents, computed once: a cheap deterministic hash, not Math.random. */
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 70 }, (_, i) => [Math.floor(hash(i) * W), Math.floor(hash(i + 100) * H)] as const);

/** Points spread evenly on the sphere (Fibonacci lattice), visited in a shuffled order. */
const GLOBE_POINTS = 600;
const LATTICE = Array.from({ length: GLOBE_POINTS }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / GLOBE_POINTS;
  return { lat: Math.asin(y), lon: i * 2.399963229728653, order: hash(i + 7) };
}).sort((a, b) => a.order - b.order);

/** A coarse land mask: a few blobs in longitude and latitude, enough to read as continents. */
const LAND: Array<[number, number, number]> = [
  [0.3, 0.6, 0.55], [1.2, 0.2, 0.45], [2.2, -0.3, 0.5], [3.4, 0.5, 0.6], [4.4, -0.4, 0.4], [5.4, 0.1, 0.5],
];
const isLand = (lat: number, lon: number) =>
  LAND.some(([lo, la, r]) => {
    const d = Math.acos(Math.sin(la) * Math.sin(lat) + Math.cos(la) * Math.cos(lat) * Math.cos(lon - lo));
    return d < r;
  });

function drawEarth(ctx: CanvasRenderingContext2D, model: SceneModel, p: Palette, now: number, last: boolean) {
  if (!last) for (const [x, y] of STARS) rect(ctx, p.line, x, y, 1, 1);
  const cx = W / 2;
  const cy = last ? 66 : H / 2;
  const r = last ? 32 : 42;
  ctx.fillStyle = p.raised;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.line;
  ctx.stroke();

  const spin = (now / 12000) % (Math.PI * 2);
  const machines = Math.round(model.density * GLOBE_POINTS);
  LATTICE.forEach(({ lat, lon }, i) => {
    const l = lon + spin;
    const z = Math.cos(lat) * Math.cos(l);
    if (z < 0) return; // far side
    const x = cx + r * Math.cos(lat) * Math.sin(l);
    const y = cy - r * Math.sin(lat);
    if (i < machines) rect(ctx, i % 13 === 0 ? p.hot : p.main, x, y, 1, 1);
    else if (isLand(lat, lon)) rect(ctx, p.land, x, y, 1, 1); // land not covered yet
  });

  if (last) {
    // The last human, standing on top of the world.
    rect(ctx, p.main, cx - 1, cy - r - 9, 3, 3);
    rect(ctx, p.main, cx - 1, cy - r - 6, 3, 6);
  }
}
