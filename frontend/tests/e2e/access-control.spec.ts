import { expect, test } from "@playwright/test";
import { demoLogin, uniqueEmail, signUp } from "./helpers";

test("logged-out visitors are sent to log in, and the destination is kept", async ({
  page,
}) => {
  await page.goto("/mood");
  await expect(page).toHaveURL(/\/login\?next=%2Fmood/);
});

test("a student cannot open administrator pages, and is sent to their own home", async ({
  page,
}) => {
  await demoLogin(page, "student@mindbridge.demo", "Student");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a psychologist cannot open the student journal page", async ({
  page,
}) => {
  await demoLogin(page, "amara@mindbridge.demo", "Psychologist");
  await page.goto("/journal");
  await expect(page).toHaveURL(/\/psychologist\/workspace$/);
});

test("a wrong password is refused with a generic message", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("student@mindbridge.demo");
  await page.locator("#password").fill("not the password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
});

test("clearing the session cookie signs the user out and protects the page", async ({
  page,
  context,
}) => {
  await signUp(page, "Session Student", uniqueEmail("session"));
  await context.clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});
