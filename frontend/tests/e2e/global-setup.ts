import { execFileSync } from "node:child_process";
import { BACKEND_DIR, PYTHON, TEST_DATABASE_URL } from "./env";

// Every end-to-end run starts from an empty, freshly migrated and seeded TEST database.
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execFileSync(PYTHON, ["scripts/reset_test_database.py"], {
    cwd: BACKEND_DIR,
    stdio: "inherit",
    env,
  });
  execFileSync(PYTHON, ["scripts/seed_demo.py"], {
    cwd: BACKEND_DIR,
    stdio: "inherit",
    env,
  });
}
