import { defineConfig, devices } from "@playwright/test";

// Playwright config is loaded in a CommonJS-like context.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const webServerPort = new URL(baseURL).port || "3000";
const shouldStartWebServer = process.env.PLAYWRIGHT_WEB_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  ...(shouldStartWebServer
    ? {
        webServer: {
          // `next dev` は同一リポジトリで1プロセスのみの制限があり、手元で dev が動いていると E2E 用の2台目が起動できない。
          // `next start` は本番サーバのため dev と併存できる。
          command: `npm run build && npx next start --hostname 127.0.0.1 --port ${webServerPort}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 300000,
        },
      }
    : {}),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
