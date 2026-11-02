import { expect, test } from "@playwright/test";
import {
  adminLogIn,
  demoLogin,
  logIn,
  logOut,
  openAmaraBooking,
  signUp,
  uniqueEmail,
  NEW_PASSWORD,
} from "./helpers";

// The psychologist's list is shared by every test in the run, so look through the bookings for the one we need.
async function detailPageLinks(
  page: import("@playwright/test").Page,
): Promise<string[]> {
  await page.goto("/psychologist/workspace/appointments");
  // The list loads its data after the page opens, so wait before reading the links.
  await page.waitForLoadState("networkidle");
  return page
    .locator("a[href^='/psychologist/workspace/appointments/']")
    .evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
}

async function findDetailShowing(
  page: import("@playwright/test").Page,
  text: string,
): Promise<boolean> {
  for (const href of await detailPageLinks(page)) {
    await page.goto(href);
    await page.waitForLoadState("networkidle");
    if (
      await page
        .getByText(text)
        .first()
        .isVisible()
        .catch(() => false)
    )
      return true;
  }
  return false;
}

async function bookAmara(page: import("@playwright/test").Page) {
  await openAmaraBooking(page);
  await page
    .locator('section[aria-labelledby="pick-date"] button')
    .first()
    .click();
  await page
    .locator('section[aria-labelledby="pick-time"] button')
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page).toHaveURL(/\/appointments\?booked=1/);
}

test("a psychologist sees a student's name only after the student shares appointment history", async ({
  page,
}) => {
  const studentName = `Consent Student ${Date.now()}`;
  await signUp(page, studentName, uniqueEmail("consent"));

  await page.goto("/settings");
  await page
    .locator("fieldset", { hasText: "Dr. Amara Osei" })
    .getByRole("checkbox", { name: "Share appointment history" })
    .click();
  await bookAmara(page);
  await logOut(page);

  await demoLogin(page, "amara@mindbridge.demo", "Psychologist");
  expect(await findDetailShowing(page, studentName)).toBe(true);
});

test("without consent, the psychologist sees no student identity", async ({
  page,
}) => {
  await signUp(page, "No Consent Student", uniqueEmail("noconsent"));
  await bookAmara(page);
  await logOut(page);

  await demoLogin(page, "amara@mindbridge.demo", "Psychologist");
  // Nobody's identity may appear, and at least one booking shows the "not shared" message.
  expect(await findDetailShowing(page, "No Consent Student")).toBe(false);
  expect(
    await findDetailShowing(
      page,
      "The student has not shared their identity with you.",
    ),
  ).toBe(true);
});

test("an administrator can suspend an account, and the suspended user cannot log in", async ({
  page,
}) => {
  const email = uniqueEmail("to-suspend");
  await signUp(page, "Suspended Candidate", email);
  await logOut(page);

  await adminLogIn(page);
  await page.goto("/admin/users");
  await page.locator("#user-search").fill(email);
  const row = page.locator("li", { hasText: email });
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByRole("button", { name: "Suspend account" }).click();
  await expect(page.getByText("has been suspended.")).toBeVisible();
  await logOut(page);

  await logIn(page, email, NEW_PASSWORD, "Student");
  await expect(
    page.getByText("This account is suspended. Please contact support."),
  ).toBeVisible();
});

test("an administrator verifies and publishes a psychologist, who then appears in the student directory", async ({
  page,
}) => {
  const name = `Directory Doctor ${Date.now()}`;
  await signUp(page, name, uniqueEmail("newpsy"), "Psychologist");
  await logOut(page);

  await adminLogIn(page);
  await page.goto("/admin/verification");
  const card = page.locator("[data-slot='card']", { hasText: name });
  await card.getByRole("button", { name: "Mark as verified" }).click();
  await card.getByRole("button", { name: "Publish profile" }).click();
  await expect(page.getByText(`${name}'s profile is published.`)).toBeVisible();
  await logOut(page);

  await signUp(page, "Directory Student", uniqueEmail("directory"));
  await page.goto("/psychologists");
  await expect(page.getByText(name, { exact: true })).toBeVisible();
});

test("the audit log records administrator actions", async ({ page }) => {
  await adminLogIn(page);
  await page.goto("/admin/settings");
  await page.locator("#cancellationWindowHours").fill("48");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(
    page.getByText("Settings saved and recorded in the audit log."),
  ).toBeVisible();
  await page.goto("/admin/audit");
  await expect(
    page.getByText("settings.cancellation_window_changed").first(),
  ).toBeVisible();
});
