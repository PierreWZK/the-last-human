import { expect, test, type Page } from "@playwright/test";

const SAVE_KEY = "the-last-human:save";

const BUILDINGS = Object.fromEntries(
  ["homePage", "forum", "shop", "shareware", "portal", "rentedServer", "dataCollector", "buyScript", "database", "cloudCluster", "datacenter", "robotArm", "gpuServer", "dataLab", "agent", "robotFactory", "planner", "gigafactory"].map((id) => [id, 0]),
);

/** A v7 save. `state` overrides the fields of a plain game. */
function save(state: Record<string, unknown>, savedAt = new Date()) {
  return JSON.stringify({
    schemaVersion: 7,
    savedAt: savedAt.toISOString(),
    state: {
      schemaVersion: 7,
      elapsedMs: 0,
      resources: { money: "0", data: "0", compute: "0", intelligence: "0", robots: "0", autonomy: "0", control: "0" },
      totalMoney: "0",
      totalClicks: 0,
      buildings: BUILDINGS,
      upgrades: {},
      event: { status: "resolved", id: "y2k", choice: "ignore" },
      eventsResolved: 1,
      effects: [],
      rngSeed: 9,
      nextEventAtMs: 99999999,
      archives: {},
      achievements: {},
      era: 1,
      scriptTarget: null,
      renaissances: 0,
      renaissances2: 0,
      algorithmPoints: 0,
      algorithms: {},
      equippedAlgorithms: [],
      models: [],
      training: null,
      renaissances3: 0,
      neuralCores: 0,
      neuralGrid: [null, null, null, null, null, null, null, null, null],
      knowledgePoints: 0,
      knowledgeBonuses: {},
      renaissances4: 0,
      aiCores: 0,
      policies: {},
      directives: {},
      eraStartedMs: [0],
      journal: [],
      runId: "e2e-run-0001",
      endings: 0,
      endedAtMs: null,
      ...state,
    },
  });
}

const ERA_FIVE = {
  era: 5,
  elapsedMs: 40_000_000,
  eraStartedMs: [0, 10_000_000, 20_000_000, 30_000_000, 35_000_000],
  renaissances: 4,
  renaissances4: 1,
  aiCores: 1,
  journal: ["y2k:ignore"],
  resources: { money: "0", data: "0", compute: "0", intelligence: "0", robots: "7000000000", autonomy: "0", control: "1000000000" },
};

async function seed(page: Page, value: string) {
  await page.addInitScript(
    ([key, v]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, v);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [SAVE_KEY, value],
  );
  await page.goto("/");
}

async function openUpgrades(page: Page) {
  const width = page.viewportSize()?.width ?? 1440;
  if (width < 900) await page.getByRole("button", { name: "Améliorer", exact: true }).click();
}

test("en ère V, on donne les directives dans l'ordre avec du Contrôle", async ({ page }) => {
  await seed(page, save(ERA_FIVE));
  await expect(page.getByText("Ère V · The Last Human")).toBeVisible();
  await openUpgrades(page);
  await expect(page.getByRole("heading", { name: "Directives" })).toBeVisible();
  await page.getByRole("button", { name: /Donner la directive/ }).click();
  await expect(page.getByText("Automatisation : 15 %")).toBeVisible();
  await page.getByRole("button", { name: "Adopter" }).first().click();
  await expect(page.getByText("AI Cores disponibles : 0")).toBeVisible();
});

test("la dernière directive termine le jeu : dialogue, écran final, puis nouvelle humanité", async ({ page }) => {
  const allButLast = Object.fromEntries(["energy", "food", "health", "school", "law"].map((id) => [id, true]));
  await seed(page, save({ ...ERA_FIVE, directives: allButLast }));
  await openUpgrades(page);
  await page.getByRole("button", { name: /Donner la directive/ }).click();

  await expect(page.getByText(/Tous les besoins humains sont satisfaits/)).toBeVisible();
  await page.getByRole("button", { name: "Passer" }).click();
  await expect(page.getByRole("heading", { name: "Fin de l'humanité n° 1" })).toBeVisible();
  await expect(page.getByText("Le bug de l'an 2000 : Ignorer · production ÷ 2 pendant 2 min")).toBeVisible();
  await expect(page.getByText(/archive figée/)).toBeVisible();

  // The end survives a reload: the game stays frozen.
  await page.reload();
  await page.getByRole("button", { name: "Passer" }).click();
  await expect(page.getByRole("heading", { name: "Fin de l'humanité n° 1" })).toBeVisible();

  await page.getByRole("button", { name: "Nouvelle humanité" }).click();
  await page.getByRole("button", { name: "Commencer une nouvelle humanité" }).click();
  await expect(page.getByText("Ère I · The Digital Age")).toBeVisible();
  await expect(page.getByRole("button", { name: "Taper du code" })).toBeVisible();
});

test("au retour, le récapitulatif montre l'absence et ce qui a été produit", async ({ page }) => {
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
  await seed(page, save({ buildings: { ...BUILDINGS, homePage: 10 } }, twoHoursAgo));
  const recap = page.getByRole("dialog", { name: "Pendant votre absence" });
  await expect(recap).toBeVisible();
  await expect(recap.getByText(/Absent pendant 2 h/)).toBeVisible();
  await expect(recap.getByText(/Argent : \+/)).toBeVisible();
  await recap.getByRole("button", { name: "Reprendre la partie" }).click();
  await expect(recap).toBeHidden();
});

test("le classement public répond, même vide", async ({ request }) => {
  const response = await request.get("/api/leaderboard");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(Array.isArray(body.fastest)).toBe(true);
  expect(Array.isArray(body.most)).toBe(true);
});
