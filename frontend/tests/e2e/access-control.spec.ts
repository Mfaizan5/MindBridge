import { expect, test } from "@playwright/test";
import { demoSignIn } from "./helpers";

test("logged-out visitors are sent to log in, and the destination is kept", async ({
  page,
}) => {
  await page.goto("/mood");
  await expect(page).toHaveURL(/\/login\?next=%2Fmood/);
});

test("a student cannot open administrator pages, and is sent to their own home", async ({
  page,
}) => {
  await demoSignIn(page, "Demo student");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a psychologist cannot open the student journal page", async ({
  page,
}) => {
  await demoSignIn(page, "Demo psychologist");
  await expect(page).toHaveURL(/\/psychologist\/workspace$/);
  await page.goto("/journal");
  await expect(page).toHaveURL(/\/psychologist\/workspace$/);
});

test("an expired session is ended and the user is told why", async ({
  page,
}) => {
  await demoSignIn(page, "Demo student");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("mindbridge:v2:session");
    if (!raw) throw new Error("no session stored");
    const session = JSON.parse(raw);
    session.lastActiveAt = new Date(
      Date.now() - 2 * 60 * 60 * 1000,
    ).toISOString();
    window.localStorage.setItem(
      "mindbridge:v2:session",
      JSON.stringify(session),
    );
  });
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByText("Your session ended after 30 minutes without activity."),
  ).toBeVisible();
});
