import { defineConfig, devices } from "@playwright/test";
import { BACKEND_DIR, PYTHON, TEST_DATABASE_URL } from "./tests/e2e/env";

// End-to-end tests run the real backend (on the TEST database) and the production frontend build.
// Stop any servers already running on ports 3000 and 8000 before running them.
// Run with: npm run build && npm run test:e2e
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: [
    {
      command: `"${PYTHON}" -m uvicorn app.main:app --host 127.0.0.1 --port 8000`,
      cwd: BACKEND_DIR,
      url: "http://127.0.0.1:8000/api/v1/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        RATE_LIMIT_PER_MINUTE: "100000",
        LOG_PASSWORD_RESET_LINKS: "true",
      },
    },
    {
      command: "npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
