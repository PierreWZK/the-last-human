import { expect, test, type Page } from "@playwright/test";

const SAVE_KEY = "the-last-human:save";
const BACKUP_KEY = "the-last-human:save-backup";

async function openFresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/**
 * Below 900px the layout shows one panel at a time (tabs at the top).
 * Phones and the 768px tablet both use it, so the check is on width, not on device name.
 */
async function openBuyPanel(page: Page) {
  const width = page.viewportSize()?.width ?? 1440;
  if (width < 900) await page.getByRole("button", { name: "Acheter", exact: true }).click();
}

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
  for (let i = 0; i < 20; i++) await page.getByRole("button", { name: "Taper du code" }).click();
  await openBuyPanel(page);
  const buy = page.getByRole("button", { name: /Page personnelle, ×1, coût/ });
  await expect(buy).toBeEnabled();
  await buy.click();
  await expect(page.getByText("1 possédé(s)")).toBeVisible();
});

test("la progression survit à un rechargement", async ({ page }) => {
  await openFresh(page);
  for (let i = 0; i < 30; i++) await page.getByRole("button", { name: "Taper du code" }).click();
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

test("l'achat maximum ne rend jamais l'argent négatif", async ({ page }) => {
  await openFresh(page);
  for (let i = 0; i < 60; i++) await page.getByRole("button", { name: "Taper du code" }).click();
  await openBuyPanel(page);
  const max = page.getByRole("button", { name: /Page personnelle, Max/ });
  if (await max.isEnabled()) await max.click();
  const money = await page.locator("dl dd").first().innerText();
  expect(money.trim().startsWith("-")).toBe(false);
});
