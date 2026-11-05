import { defineConfig } from "@playwright/test";

// E2E_BASE_URL gesetzt: gegen laufende Instanz testen (z. B. Live-Seite). Sonst lokalen Dev-Server starten.
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL, channel: "chrome", viewport: { width: 400, height: 850 } },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "npx nuxt dev --port 3000 --host 127.0.0.1",
    url: "http://127.0.0.1:3000/api/live/walgau",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
