import { describe, expect, it } from "vitest";
import { createInitialState, humanDependency } from "@/game/engine";
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ARCHIVES, ARCHIVE_CATEGORIES } from "./milestones";

describe("succès et archives", () => {
  it("compte 7 + 100 succès et 8 + 100 archives, aux identifiants uniques", () => {
    expect(ACHIEVEMENTS).toHaveLength(107);
    expect(ARCHIVES).toHaveLength(108);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ARCHIVES.map((a) => a.id)).size).toBe(ARCHIVES.length);
  });

  it("chaque entrée a une indication en français et une catégorie connue", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.hint.length).toBeGreaterThan(5);
      expect(ACHIEVEMENT_CATEGORIES).toContain(a.category);
    }
    for (const a of ARCHIVES) {
      expect(a.hint.length).toBeGreaterThan(5);
      expect(ARCHIVE_CATEGORIES).toContain(a.category);
    }
  });

  it("rien n'est débloqué au début d'une partie", () => {
    const state = createInitialState(1);
    const view = { state, human: humanDependency(state) };
    expect(ACHIEVEMENTS.filter((a) => a.check(view)).map((a) => a.id)).toEqual([]);
    expect(ARCHIVES.filter((a) => a.check(view)).map((a) => a.id)).toEqual([]);
  });
});
