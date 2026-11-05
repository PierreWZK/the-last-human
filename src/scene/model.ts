import type { EraOneBuildingId, GameState } from "@/game/types";

/**
 * What the scene shows, derived from the game state. Pure, so it is tested without a canvas.
 * The drawing code only reads this model; it never reads GameState directly.
 */

export interface SceneModel {
  /** Number of copies of each building drawn in the room (capped per building). */
  shown: Record<EraOneBuildingId, number>;
  /** Visual tier 0–4 of each building, from the 1 / 10 / 25 / 50 thresholds. */
  tiers: Record<EraOneBuildingId, number>;
  /** Something produces on its own: the screen types by itself and packets fly. */
  automated: boolean;
  /** The year-2000 event is waiting for an answer. */
  y2kOpen: boolean;
  /** The « ignore » slowdown is running. */
  slowed: boolean;
}

/** How many copies of each building the room can hold before it stops adding more. */
export const SHOWN_CAP: Record<EraOneBuildingId, number> = {
  homePage: 12,
  forum: 4,
  shop: 9,
  shareware: 6,
  portal: 1,
  rentedServer: 8,
};

export function tierFor(count: number): number {
  if (count >= 50) return 4;
  if (count >= 25) return 3;
  if (count >= 10) return 2;
  if (count >= 1) return 1;
  return 0;
}

export function sceneModel(state: GameState): SceneModel {
  const ids = Object.keys(SHOWN_CAP) as EraOneBuildingId[];
  const shown = {} as Record<EraOneBuildingId, number>;
  const tiers = {} as Record<EraOneBuildingId, number>;
  for (const id of ids) {
    const count = state.buildings[id];
    shown[id] = Math.min(count, SHOWN_CAP[id]);
    tiers[id] = tierFor(count);
  }
  return {
    shown,
    tiers,
    automated: ids.some((id) => state.buildings[id] > 0),
    y2kOpen: state.event.status === "open" && state.event.id === "y2k",
    slowed: state.effects.length > 0,
  };
}
