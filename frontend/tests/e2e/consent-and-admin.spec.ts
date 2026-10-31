import { expect, test } from "@playwright/test";
import { demoSignIn, logIn, logOut, signUp, uniqueEmail } from "./helpers";

test("a psychologist sees a student's name only after the student shares appointment history", async ({
  page,
}) => {
  const studentName = `Consent Student ${Date.now()}`;
  await signUp(page, studentName, uniqueEmail("consent"));

  // The student shares appointment history with Dr. Amara Osei, then books
  await page.goto("/settings");
  await page
    .locator("fieldset", { hasText: "Dr. Amara Osei" })
    .getByRole("checkbox", { name: "Share appointment history" })
    .click();
  await page.goto("/psychologists/psy-amara/book");
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
  await logOut(page);

  // The psychologist opens the booking
  await demoSignIn(page, "Demo psychologist");
  await page.goto("/psychologist/workspace/appointments");
  await page
    .locator("a[href^='/psychologist/workspace/appointments/']")
    .first()
    .click();
  await expect(page.getByText(`Name: ${studentName}`)).toBeVisible();
});

test("without consent, the psychologist sees no student identity", async ({
  page,
}) => {
  await signUp(page, "No Consent Student", uniqueEmail("noconsent"));
  await page.goto("/psychologists/psy-amara/book");
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
  await logOut(page);

  await demoSignIn(page, "Demo psychologist");
  await page.goto("/psychologist/workspace/appointments");
  await page
    .locator("a[href^='/psychologist/workspace/appointments/']")
    .first()
    .click();
  await expect(
    page.getByText("The student has not shared their identity with you."),
  ).toBeVisible();
  await expect(page.getByText("No Consent Student")).toHaveCount(0);
});

test("an administrator can suspend an account, and the suspended user cannot log in", async ({
  page,
}) => {
  await demoSignIn(page, "Demo administrator");
  await page.goto("/admin/users");
  const row = page.locator("li", { hasText: "student@mindbridge.demo" });
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByRole("button", { name: "Suspend account" }).click();
  await expect(
    page.getByText("Demo Student has been suspended."),
  ).toBeVisible();
  await logOut(page);

  await logIn(page, "student@mindbridge.demo");
  await expect(
    page.getByText("This account is suspended. Please contact support."),
  ).toBeVisible();
});

test("an administrator verifies and publishes a psychologist, who then appears in the student directory", async ({
  page,
}) => {
  await demoSignIn(page, "Demo administrator");
  await page.goto("/admin/verification");
  const card = page.locator("[data-slot='card']", { hasText: "Mei Lin Tan" });
  await card.getByRole("button", { name: "Mark as verified" }).click();
  await card.getByRole("button", { name: "Publish profile" }).click();
  await expect(
    page.getByText("Mei Lin Tan's profile is published."),
  ).toBeVisible();
  await logOut(page);

  await signUp(page, "Directory Student", uniqueEmail("directory"));
  await page.goto("/psychologists");
  await expect(page.getByText("Mei Lin Tan", { exact: true })).toBeVisible();
});

test("the audit log records administrator actions", async ({ page }) => {
  await demoSignIn(page, "Demo administrator");
  await page.goto("/admin/settings");
  await page.locator("#cancellationWindowHours").fill("48");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(
    page.getByText("Settings saved and recorded in the audit log."),
  ).toBeVisible();
  await page.goto("/admin/audit");
  await expect(
    page.getByText("Set cancellation window to 48 hours"),
  ).toBeVisible();
});
