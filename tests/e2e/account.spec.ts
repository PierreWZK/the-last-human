import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Better Auth limits sign-ups per IP. Every test is its own visitor, so each one gets its own
 * address through x-forwarded-for (the header the production proxy sets too).
 */
const visitorIp = () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": visitorIp() });
});

async function newVisitor(browser: Browser, page: Page) {
  const context = await browser.newContext({
    viewport: page.viewportSize() ?? undefined,
    extraHTTPHeaders: { "x-forwarded-for": visitorIp() },
  });
  return { context, page: await context.newPage() };
}

/** A pseudo unique per test and per screen size (3 to 20 characters). */
function uniqueName(): string {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(0, 20);
}

async function openAccount(page: Page) {
  const width = page.viewportSize()?.width ?? 1440;
  if (width < 900) await page.getByRole("button", { name: "Compte", exact: true }).click();
}

async function signUp(page: Page, username: string) {
  await openAccount(page);
  await page.getByLabel(/Pseudo \(3 à 20/).fill(username);
  await page.getByLabel(/Mot de passe/).fill("motdepasse-e2e");
  await page.getByRole("button", { name: "Créer le compte" }).click();
}

test("créer un compte reprend la partie invitée et la sauvegarde sur le serveur", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Taper du code" }).click();
  await page.getByRole("button", { name: "Taper du code" }).click();

  const username = uniqueName();
  await signUp(page, username);
  await expect(page.getByText(`Connecté : ${username}`)).toBeVisible();
  await expect(page.getByText(/Sauvegardé sur le serveur \(révision 1\)/)).toBeVisible();

  const saved = await page.evaluate(async () => (await fetch("/api/save")).json());
  expect(saved.revision).toBe(1);
  expect(JSON.parse(saved.data).state.totalClicks).toBe(2);
});

test("un pseudo déjà pris est refusé avec un message clair", async ({ page, browser }) => {
  const username = uniqueName();
  await page.goto("/");
  await signUp(page, username);
  await expect(page.getByText(`Connecté : ${username}`)).toBeVisible();

  const { context, page: other } = await newVisitor(browser, page);
  await other.goto("/");
  await signUp(other, username.toUpperCase());
  await expect(other.getByText("Ce pseudo est déjà pris.")).toBeVisible();
  await context.close();
});

test("ouvrir la partie sur un second appareil met le premier en lecture seule", async ({ page, browser }) => {
  const username = uniqueName();
  await page.goto("/");
  await signUp(page, username);
  await expect(page.getByText(/révision 1/)).toBeVisible();

  // Second device: same account, its own storage. It loads the server game and takes over.
  const { context: second, page: phone } = await newVisitor(browser, page);
  await phone.goto("/");
  await openAccount(phone);
  await phone.getByRole("tab", { name: "Se connecter" }).click();
  await phone.getByLabel("Pseudo ou email").fill(username);
  await phone.getByLabel(/Mot de passe/).fill("motdepasse-e2e");
  await phone.getByRole("button", { name: "Se connecter", exact: true }).last().click();
  await expect(phone.getByText(`Connecté : ${username}`)).toBeVisible();
  await expect(phone.getByText(/Sauvegardé sur le serveur/)).toBeVisible();

  // The first device's next save is refused: it becomes read-only and offers « Reprendre ici ».
  await page.getByRole("button", { name: "Sauvegarder maintenant" }).click();
  await expect(page.getByRole("button", { name: "Reprendre ici" })).toBeVisible();
  await page.getByRole("button", { name: "Reprendre ici" }).click();
  await expect(page.getByRole("button", { name: "Reprendre ici" })).toBeHidden();
  await second.close();
});
