import { expect, test } from "@playwright/test";

const SAVE_KEY = "the-last-human:save";

/** A v3 save where every upgrade of era I is owned: loading it also exercises the v3 -> v4 migration. */
const ERA_ONE_DONE = JSON.stringify({
  schemaVersion: 3,
  savedAt: new Date().toISOString(),
  state: {
    schemaVersion: 3,
    elapsedMs: 0,
    resources: { money: "900", data: "40" },
    totalMoney: "1000000",
    totalClicks: 0,
    buildings: { homePage: 20, forum: 0, shop: 0, shareware: 0, portal: 0, rentedServer: 0 },
    upgrades: Object.fromEntries(
      ["keyboard", "mouse", "touchTyping", "manualFlow", "darkTheme", "freeHosting", "moderation", "forumCharter", "onlinePayment", "catalog", "proVersion", "companyLicense", "seo", "targetedAds", "longContract", "liquidCooling", "crossLinks", "webRing", "nightBackup", "localNetwork", "wordOfMouth", "dialUpGone"].map((id) => [id, true]),
    ),
    event: { status: "resolved", id: "y2k", choice: "ignore" },
    eventsResolved: 1,
    effects: [],
    rngSeed: 5,
    nextEventAtMs: 99999999,
    archives: {},
    achievements: {},
    renaissances: 0,
    knowledgePoints: 0,
    knowledgeBonuses: {},
  },
});

test("la renaissance I se fait en deux temps et ouvre l'ère II", async ({ page }) => {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [SAVE_KEY, ERA_ONE_DONE],
  );
  await page.goto("/");

  const width = page.viewportSize()?.width ?? 1440;
  if (width < 900) await page.getByRole("button", { name: "Améliorer", exact: true }).click();

  await page.getByRole("button", { name: "Préparer la renaissance" }).click();
  await expect(page.getByText("Ce que vous perdez et ce que vous gagnez")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la renaissance" }).click();

  await expect(page.getByText("Ère II · The Automation Age")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arbre de Knowledge" })).toBeVisible();
  await expect(page.getByText("Points disponibles : 10")).toBeVisible();

  await page.getByRole("button", { name: "Acquérir" }).first().click();
  await expect(page.getByText("Points disponibles : 9")).toBeVisible();
});

/** A v5 save in era III, with Données and Calcul for a training run. */
const ERA_THREE = JSON.stringify({
  schemaVersion: 5,
  savedAt: new Date().toISOString(),
  state: {
    schemaVersion: 5,
    elapsedMs: 0,
    resources: { money: "0", data: "10000", compute: "100000", intelligence: "0" },
    totalMoney: "0",
    totalClicks: 0,
    buildings: { homePage: 0, forum: 0, shop: 0, shareware: 0, portal: 0, rentedServer: 0, dataCollector: 0, buyScript: 0, database: 0, cloudCluster: 0, datacenter: 0, robotArm: 0, gpuServer: 0, dataLab: 0, agent: 0 },
    upgrades: {},
    event: { status: "resolved", id: "y2k", choice: "ignore" },
    eventsResolved: 1,
    effects: [],
    rngSeed: 7,
    nextEventAtMs: 99999999,
    archives: {},
    achievements: {},
    era: 3,
    scriptTarget: null,
    renaissances: 2,
    renaissances2: 1,
    algorithmPoints: 3,
    algorithms: {},
    equippedAlgorithms: [],
    models: [],
    training: null,
    knowledgePoints: 0,
    knowledgeBonuses: {},
  },
});

test("en ère III, on lance un entraînement de modèle", async ({ page }) => {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [SAVE_KEY, ERA_THREE],
  );
  await page.goto("/");

  const width = page.viewportSize()?.width ?? 1440;
  if (width < 900) await page.getByRole("button", { name: "Améliorer", exact: true }).click();

  await expect(page.getByText("Ère III · The AI Revolution")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Algorithmes" })).toBeVisible();
  await page.getByRole("button", { name: "Lancer un entraînement" }).click();
  await expect(page.getByRole("button", { name: "Entraînement en cours" })).toBeVisible();
});

/** A v6 save in era IV, after one renaissance III, with two Neural Cores to place. */
const ERA_FOUR = (() => {
  const env = JSON.parse(ERA_THREE);
  env.schemaVersion = 6;
  Object.assign(env.state, {
    schemaVersion: 6,
    era: 4,
    renaissances: 3,
    renaissances3: 1,
    neuralCores: 2,
    neuralGrid: [null, null, null, null, null, null, null, null, null],
  });
  env.state.resources = { ...env.state.resources, robots: "0", autonomy: "0" };
  env.state.buildings = { ...env.state.buildings, robotFactory: 0, planner: 0, gigafactory: 0 };
  return JSON.stringify(env);
})();

test("en ère IV, on place un core sur la grille neuronale", async ({ page }) => {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [SAVE_KEY, ERA_FOUR],
  );
  await page.goto("/");

  await expect(page.getByText("Ère IV · The Autonomous Age")).toBeVisible();
  await expect(page.getByText("Robots", { exact: true })).toBeVisible();

  const width = page.viewportSize()?.width ?? 1440;
  if (width < 900) await page.getByRole("button", { name: "Améliorer", exact: true }).click();

  await expect(page.getByText("Neural Cores à placer : 2")).toBeVisible();
  await page.getByRole("radio", { name: "Core de réplication" }).click();
  await page.getByRole("button", { name: "Case 5 vide : placer Core de réplication" }).click();
  await expect(page.getByText("Neural Cores à placer : 1")).toBeVisible();
  await page.getByRole("button", { name: /Case 5 : Core de réplication/ }).click();
  await expect(page.getByText("Neural Cores à placer : 2")).toBeVisible();
});
