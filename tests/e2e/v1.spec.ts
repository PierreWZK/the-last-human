import { expect, test, type Page } from "@playwright/test";

const SAVE_KEY = "the-last-human:save";
const BACKUP_KEY = "the-last-human:save-backup";

async function openFresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/**
 * Types on the keyboard (real, trusted key presses, under the 20 per second limit) until the first
 * building is affordable: each key works like a click on « Taper du code ».
 * Reads the buy button on the DOM: on phones the buy panel is hidden, and role queries skip it.
 */
async function earnUntilAffordable(page: Page) {
  for (let batch = 0; batch < 20; batch++) {
    const affordable = await page.evaluate(() => {
      const buy = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? "").startsWith("Page personnelle, ×1"));
      return Boolean(buy && !buy.disabled);
    });
    if (affordable) return;
    await page.keyboard.type("x".repeat(10), { delay: 60 });
  }
  throw new Error("La première page personnelle n'est jamais devenue achetable");
}

/**
 * Below 900px the layout shows one panel at a time (tabs at the top).
 * Phones and the 768px tablet both use it, so the check is on width, not on device name.
 */
async function openBuyPanel(page: Page) {
  const width = page.viewportSize()?.width ?? 1440;
  if (width < 900) await page.getByRole("button", { name: "Acheter", exact: true }).click();
}

test("un clic fait par un script (console F12) ne rapporte rien", async ({ page }) => {
  await openFresh(page);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Taper du code");
    for (let i = 0; i < 100; i++) button?.click();
  });
  // A real click right after still counts, alone: the hundred script clicks earned nothing.
  await page.getByRole("button", { name: "Taper du code" }).click();
  await expect(page.getByText("Gains au total : 1,0")).toBeVisible();
});

test("le clic manuel fait monter l'argent", async ({ page }) => {
  await openFresh(page);
  const click = page.getByRole("button", { name: "Taper du code" });
  await click.click();
  await click.click();
  await click.click();
  await expect(page.getByText("Gains au total : 3,0")).toBeVisible();
});

test("acheter une page personnelle diminue l'argent et ajoute un bâtiment", async ({ page }) => {
  await openFresh(page);
  await earnUntilAffordable(page);
  await openBuyPanel(page);
  const buy = page.getByRole("button", { name: /Page personnelle, ×1, coût/ });
  await expect(buy).toBeEnabled();
  await buy.click();
  await expect(page.getByText("1 possédé(s)")).toBeVisible();
});

test("la progression survit à un rechargement", async ({ page }) => {
  await openFresh(page);
  await earnUntilAffordable(page);
  await openBuyPanel(page);
  await page.getByRole("button", { name: /Page personnelle, ×1, coût/ }).click();
  await page.reload();
  await openBuyPanel(page);
  await expect(page.getByText("1 possédé(s)")).toBeVisible();
});

test("une sauvegarde illisible est gardée, pas écrasée", async ({ page }) => {
  const corrupt = "{ceci n'est pas une sauvegarde";
  // Seed the corrupt save before the app's first load only; a reload must not re-seed it.
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [SAVE_KEY, corrupt],
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("copie a été conservée");
  const backup = await page.evaluate((key) => localStorage.getItem(key), BACKUP_KEY);
  expect(backup).toBe(corrupt);
});

test("la scène s'affiche sans erreur et la toucher tape du code", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openFresh(page);
  const scene = page.getByRole("img", { name: /Votre bureau en 1990/ });
  await expect(scene).toBeVisible();
  await scene.click();
  await expect(page.getByText("Gains au total : 1,0")).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test("avec le mouvement réduit, la scène reste une image fixe sans erreur", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFresh(page);
  const scene = page.getByRole("img", { name: /Votre bureau en 1990/ });
  await expect(scene).toBeVisible();
  await scene.click();
  await expect(page.getByText("Gains au total : 1,0")).toBeVisible();
  expect(errors).toEqual([]);
});

test("l'achat maximum ne rend jamais l'argent négatif", async ({ page }) => {
  await openFresh(page);
  await earnUntilAffordable(page);
  await openBuyPanel(page);
  const max = page.getByRole("button", { name: /Page personnelle, Max/ });
  if (await max.isEnabled()) await max.click();
  const money = await page.locator("dl dd").first().innerText();
  expect(money.trim().startsWith("-")).toBe(false);
});

test("taper au clavier écrit du code et rapporte comme un clic (ordinateur)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "pas de clavier physique sur écran tactile");
  await openFresh(page);
  await expect(page.getByText("Une ligne bonus apparaît toutes les minutes.")).toBeVisible();
  await page.keyboard.type("abc", { delay: 80 });
  await expect(page.getByText("Gains au total : 3,0")).toBeVisible();
});
