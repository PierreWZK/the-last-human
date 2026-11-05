import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone-360", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } },
    { name: "phone-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
