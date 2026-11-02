import { expect, type Page } from "@playwright/test";
import { readBackendEnv } from "./env";

// Fresh, unique account per test, so tests never depend on each other's data.
export function uniqueEmail(prefix = "student") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

// Passwords for the seeded test accounts come from backend/.env, never from the test code.
const env = readBackendEnv();
export const DEMO_PASSWORD = env.SEED_DEMO_PASSWORD;
export const ADMIN_EMAIL = "admin@mindbridge.com";
export const ADMIN_PASSWORD = env.SEED_ADMIN_PASSWORD;
export const NEW_PASSWORD = "correct horse battery";

async function chooseRole(
  page: Page,
  role: "Student" | "Psychologist" | "Administrator",
) {
  await page.getByRole("radio", { name: role }).click({ force: true });
}

export async function signUp(
  page: Page,
  name: string,
  email: string,
  role: "Student" | "Psychologist" = "Student",
) {
  await page.goto("/signup");
  if (role !== "Student") await chooseRole(page, role);
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(NEW_PASSWORD);
  // Click the visible label: the checkbox input itself is visually hidden by the UI library.
  await page.locator('label[for="terms"]').click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(
    role === "Psychologist" ? /\/psychologist\/workspace$/ : /\/dashboard$/,
  );
}

export async function logIn(
  page: Page,
  email: string,
  password: string,
  role?: "Student" | "Psychologist" | "Administrator",
) {
  await page.goto("/login");
  if (role) await chooseRole(page, role);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function demoLogin(
  page: Page,
  email: string,
  role: "Student" | "Psychologist",
) {
  await logIn(page, email, DEMO_PASSWORD, role);
  await expect(page).toHaveURL(
    role === "Psychologist" ? /\/psychologist\/workspace$/ : /\/dashboard$/,
  );
}

export async function adminLogIn(page: Page) {
  await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD, "Administrator");
  await expect(page).toHaveURL(/\/admin$/);
}

// Signs out from wherever the user is. On small screens the button lives behind the "More" menu.
export async function logOut(page: Page) {
  const more = page.getByRole("button", { name: "More" });
  const showsMore = await more
    .waitFor({ state: "visible", timeout: 3_000 })
    .then(
      () => true,
      () => false,
    );
  if (showsMore) {
    await more.click();
    await page
      .locator("#mobile-more")
      .getByRole("button", { name: "Log out" })
      .click();
  } else {
    await page.getByRole("button", { name: "Log out" }).first().click();
  }
  await expect(page).toHaveURL(/\/login/);
}

// Opens the booking page for the demo psychologist through the directory, as a student would.
export async function openAmaraBooking(page: Page) {
  await page.goto("/psychologists");
  await page
    .getByRole("link", { name: /View profile of Dr\. Amara Osei/ })
    .click();
  await page.getByRole("link", { name: "Book appointment" }).click();
  await expect(
    page.getByRole("heading", { name: /Book with Dr\. Amara Osei/ }),
  ).toBeVisible();
}
