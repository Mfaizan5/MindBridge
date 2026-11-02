import fs from "node:fs";
import path from "node:path";

// Reads backend/.env for the end-to-end run. Values are used only for logging in to the test database.
export const BACKEND_DIR = path.resolve(__dirname, "../../../backend");
export const PYTHON = path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe");

export function readBackendEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  const file = path.join(BACKEND_DIR, ".env");
  if (!fs.existsSync(file))
    throw new Error(
      "backend/.env is missing. Create it first (see docs/setup-guide.md).",
    );
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

export const TEST_DATABASE_URL = (() => {
  const url = readBackendEnv().TEST_DATABASE_URL;
  if (!url || !url.includes("mindbridge_test"))
    throw new Error(
      "TEST_DATABASE_URL must point at mindbridge_test in backend/.env",
    );
  return url;
})();
