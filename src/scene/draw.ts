import type { BuildingId, EraOneBuildingId } from "@/game/types";
import type { SceneModel } from "./model";

/**
 * Pixel-art room drawn with rectangles on a 192 × 108 canvas, scaled up without smoothing.
 * Everything is drawn from code in the Le Poste palette: no image files.
 */

export const SCENE_W = 192;
export const SCENE_H = 108;
const FLOOR = 80;

const C = {
  ink: "#0c0a06",
  wall: "#17130b",
  floor: "#211a0e",
  line: "#3a2a0c",
  dim: "#a87300",
  amber: "#ffb000",
  hot: "#ffd27a",
};

type Point = [number, number];

/** Where each building sends its packets from, and where they land (the screen). */
const ANCHORS: Record<EraOneBuildingId, Point> = {
  homePage: [26, 22],
  forum: [116, 16],
  shop: [160, 62],
  shareware: [116, 59],
  portal: [166, 16],
  rentedServer: [14, 50],
};
const SCREEN_CENTER: Point = [91, 47];
const PACKET_MS = 900;
const FLOAT_MS = 800;
const MAX_PACKETS = 30;

export interface SceneFx {
  typingUntil: number;
  /** Lines typed by hand. */
  lines: number;
  /** Lines typed by the machines, accumulated as a fraction. */
  autoLines: number;
  packets: Array<{ from: Point; t0: number }>;
  floats: Array<{ t0: number; text: string }>;
  nextPacket: Partial<Record<BuildingId, number>>;
}

export function createFx(): SceneFx {
  return { typingUntil: 0, lines: 0, autoLines: 0, packets: [], floats: [], nextPacket: {} };
}

/** A manual click: the character types, the screen scrolls, a gain floats up. */
export function onManualClick(fx: SceneFx, now: number, gainText: string): void {
  fx.typingUntil = now + 320;
  fx.lines += 1;
  fx.floats.push({ t0: now, text: gainText });
  if (fx.floats.length > 6) fx.floats.shift();
}

/** Advances the effects by `dtMs`: automatic typing, packets from buildings, expiry. */
export function advanceFx(fx: SceneFx, model: SceneModel, now: number, dtMs: number): void {
  if (model.automated) {
    const speed = Object.values(model.tiers).reduce((a, b) => a + b, 0) * 0.6;
    fx.autoLines += (dtMs / 1000) * speed * (model.slowed ? 0.5 : 1);
  }
  for (const id of Object.keys(ANCHORS) as EraOneBuildingId[]) {
    if (model.shown[id] === 0) continue;
    const due = fx.nextPacket[id] ?? now;
    if (now >= due) {
      if (fx.packets.length < MAX_PACKETS) fx.packets.push({ from: ANCHORS[id], t0: now });
      const interval = Math.max(450, 1700 - model.tiers[id] * 300);
      fx.nextPacket[id] = now + interval * (model.slowed ? 2 : 1);
    }
  }
  fx.packets = fx.packets.filter((p) => now - p.t0 < PACKET_MS);
  fx.floats = fx.floats.filter((f) => now - f.t0 < FLOAT_MS);
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function drawScene(ctx: CanvasRenderingContext2D, model: SceneModel, fx: SceneFx, now: number): void {
  ctx.imageSmoothingEnabled = false;
  drawRoom(ctx);
  drawServerRack(ctx, model, now);
  drawWallPages(ctx, model);
  drawForumBubbles(ctx, model, now);
  drawPortalWindow(ctx, model, now);
  drawDesk(ctx);
  drawFloppies(ctx, model);
  drawMonitor(ctx, model, fx, now);
  drawKeyboard(ctx);
  drawCharacter(ctx, now < fx.typingUntil, now);
  drawBoxes(ctx, model);
  drawPackets(ctx, fx, now);
  drawFloats(ctx, fx, now);
}

function drawRoom(ctx: CanvasRenderingContext2D) {
  rect(ctx, C.wall, 0, 0, SCENE_W, FLOOR);
  rect(ctx, C.floor, 0, FLOOR, SCENE_W, SCENE_H - FLOOR);
  rect(ctx, C.line, 0, FLOOR, SCENE_W, 1);
  // Skirting board and a wall socket: the room exists before anything is bought.
  rect(ctx, C.line, 0, FLOOR - 2, SCENE_W, 2);
  rect(ctx, C.line, 140, 70, 3, 4);
}

function drawDesk(ctx: CanvasRenderingContext2D) {
  rect(ctx, C.dim, 52, 64, 88, 3);
  rect(ctx, C.line, 56, 67, 3, FLOOR - 67);
  rect(ctx, C.line, 133, 67, 3, FLOOR - 67);
}

function drawKeyboard(ctx: CanvasRenderingContext2D) {
  rect(ctx, C.line, 58, 62, 22, 2);
  rect(ctx, C.dim, 59, 62, 20, 1);
}

function drawMonitor(ctx: CanvasRenderingContext2D, model: SceneModel, fx: SceneFx, now: number) {
  rect(ctx, C.dim, 74, 34, 34, 27);
  rect(ctx, C.line, 86, 61, 10, 3);
  const sx = 78;
  const sy = 38;
  const sw = 26;
  const sh = 19;

  const flicker = model.y2kOpen && Math.floor(now / 150) % 2 === 0;
  rect(ctx, flicker ? C.amber : C.ink, sx, sy, sw, sh);
  if (flicker) {
    ctx.fillStyle = C.ink;
    ctx.font = "7px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("1900", sx + 5, sy + 6);
    return;
  }

  // Code lines scroll up as lines are typed, by hand or by the machines.
  const scroll = fx.lines + Math.floor(fx.autoLines);
  const lineColor = model.slowed ? C.dim : C.amber;
  for (let row = 0; row < 6; row++) {
    const i = scroll + row;
    const indent = ((i * 13) % 3) * 2;
    const width = ((i * 37) % 15) + 4;
    rect(ctx, lineColor, sx + 2 + indent, sy + 2 + row * 3, Math.min(width, sw - 4 - indent), 1);
  }
  // Blinking cursor on the last line.
  if (Math.floor(now / 400) % 2 === 0) rect(ctx, C.hot, sx + 2, sy + 2 + 6 * 3 - 1, 2, 1);
  if (model.slowed) {
    ctx.fillStyle = C.hot;
    ctx.font = "5px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("1900", sx + sw - 13, sy + 1);
  }
}

function drawCharacter(ctx: CanvasRenderingContext2D, typing: boolean, now: number) {
  // Chair
  rect(ctx, C.line, 30, 48, 3, FLOOR - 48);
  rect(ctx, C.line, 30, 66, 20, 2);
  rect(ctx, C.line, 40, 68, 2, FLOOR - 68);
  // Head and hair
  rect(ctx, C.amber, 40, 37, 7, 8);
  rect(ctx, C.dim, 40, 36, 7, 3);
  rect(ctx, C.dim, 40, 39, 2, 3);
  rect(ctx, C.ink, 45, 40, 1, 1);
  // Torso and legs
  rect(ctx, C.dim, 39, 45, 9, 19);
  rect(ctx, C.dim, 44, 63, 14, 3);
  rect(ctx, C.dim, 55, 66, 3, FLOOR - 67);
  rect(ctx, C.amber, 55, FLOOR - 2, 5, 2);
  // Arms: they alternate when typing, rest on the keyboard otherwise.
  const frame = typing ? Math.floor(now / 70) % 2 : 0;
  rect(ctx, C.amber, 47, 49, 7, 3);
  rect(ctx, C.amber, 53, 56 - frame, 8, 2);
  rect(ctx, C.hot, 60, 58 - frame * 2, 3, 2);
}

function drawWallPages(ctx: CanvasRenderingContext2D, model: SceneModel) {
  const n = model.shown.homePage;
  if (n === 0) return;
  rect(ctx, C.line, 8, 8, 38, 28);
  for (let i = 0; i < n; i++) {
    const x = 10 + (i % 4) * 9;
    const y = 10 + Math.floor(i / 4) * 8;
    rect(ctx, C.dim, x, y, 7, 6);
    rect(ctx, C.amber, x, y, 7, 1);
    rect(ctx, C.ink, x + 1, y + 2, 5, 3);
  }
}

function drawForumBubbles(ctx: CanvasRenderingContext2D, model: SceneModel, now: number) {
  for (let i = 0; i < model.shown.forum; i++) {
    const bob = Math.round(Math.sin(now / 600 + i * 1.7));
    const x = 112 + i * 9;
    const y = 8 + (i % 2) * 9 + bob;
    rect(ctx, C.dim, x, y, 8, 5);
    rect(ctx, C.amber, x + 1, y + 2, 2 + ((i * 3) % 5), 1);
    rect(ctx, C.dim, x + 1, y + 5, 2, 1);
  }
}

function drawPortalWindow(ctx: CanvasRenderingContext2D, model: SceneModel, now: number) {
  rect(ctx, C.line, 152, 8, 32, 26);
  rect(ctx, C.ink, 154, 10, 28, 22);
  rect(ctx, C.line, 167, 10, 1, 22);
  if (model.shown.portal === 0) return;
  // Antenna on the roof across the street, with signal waves.
  rect(ctx, C.dim, 160, 26, 14, 6);
  rect(ctx, C.dim, 166, 14, 1, 12);
  rect(ctx, C.amber, 164, 14, 5, 1);
  const phase = Math.floor(now / 350) % 4;
  for (let k = 1; k <= Math.min(model.tiers.portal, 3); k++) {
    if (phase < k) continue;
    rect(ctx, C.amber, 165 - 2 * k, 13 - k, 1, 1);
    rect(ctx, C.amber, 167 + 2 * k, 13 - k, 1, 1);
  }
}

function drawServerRack(ctx: CanvasRenderingContext2D, model: SceneModel, now: number) {
  const n = model.shown.rentedServer;
  if (n === 0) return;
  rect(ctx, C.line, 4, 38, 20, FLOOR - 38);
  for (let i = 0; i < n; i++) {
    const y = 40 + i * 5;
    rect(ctx, C.dim, 6, y, 16, 3);
    const on = Math.floor(now / (180 + i * 41)) % 2 === 0;
    rect(ctx, on ? C.hot : C.line, 19, y + 1, 2, 1);
  }
}

function drawFloppies(ctx: CanvasRenderingContext2D, model: SceneModel) {
  for (let i = 0; i < model.shown.shareware; i++) {
    const y = 61 - i * 2;
    rect(ctx, C.dim, 112, y, 10, 2);
    rect(ctx, C.amber, 115, y, 4, 1);
  }
}

function drawBoxes(ctx: CanvasRenderingContext2D, model: SceneModel) {
  for (let i = 0; i < model.shown.shop; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 146 + col * 13;
    const y = FLOOR - 10 - row * 10;
    rect(ctx, C.dim, x, y, 12, 10);
    rect(ctx, C.line, x, y, 12, 1);
    rect(ctx, C.amber, x + 5, y, 2, 10);
  }
}

function drawPackets(ctx: CanvasRenderingContext2D, fx: SceneFx, now: number) {
  for (const p of fx.packets) {
    const t = Math.min((now - p.t0) / PACKET_MS, 1);
    const ease = t * t * (3 - 2 * t);
    const x = p.from[0] + (SCREEN_CENTER[0] - p.from[0]) * ease;
    const y = p.from[1] + (SCREEN_CENTER[1] - p.from[1]) * ease - Math.sin(t * Math.PI) * 8;
    rect(ctx, C.hot, Math.round(x), Math.round(y), 2, 2);
  }
}

function drawFloats(ctx: CanvasRenderingContext2D, fx: SceneFx, now: number) {
  ctx.font = "7px monospace";
  ctx.textBaseline = "top";
  for (const f of fx.floats) {
    const t = (now - f.t0) / FLOAT_MS;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = C.hot;
    ctx.fillText(f.text, 84, Math.round(28 - t * 14));
  }
  ctx.globalAlpha = 1;
}
