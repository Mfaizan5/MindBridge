import { expect, type Page } from "@playwright/test";

// Fresh, unique student account per test, so tests never depend on each other's data.
export function uniqueEmail(prefix = "student") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export async function signUp(page: Page, name: string, email: string) {
  await page.goto("/signup");
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("correct horse battery");
  // Click the visible label: the checkbox input itself is visually hidden by the UI library.
  await page.locator('label[for="terms"]').click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("any-password");
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function demoSignIn(page: Page, label: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: `Continue as ${label}` }).click();
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
