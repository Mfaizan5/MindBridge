import { expect, test } from "@playwright/test";
import { logOut, openAmaraBooking, signUp, uniqueEmail } from "./helpers";

async function bookFirstOpenTime(
  page: import("@playwright/test").Page,
  useLastDate = false,
) {
  await openAmaraBooking(page);
  const dates = page.locator('section[aria-labelledby="pick-date"] button');
  await (useLastDate ? dates.last() : dates.first()).click();
  await page
    .locator('section[aria-labelledby="pick-time"] button')
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page).toHaveURL(/\/appointments\?booked=1/);
}

test("a new student records a check-in, sees progress, writes a journal entry, and books a psychologist", async ({
  page,
}) => {
  await signUp(page, "Journey Student", uniqueEmail("journey"));

  await page.goto("/mood");
  await page.getByText("Happy", { exact: true }).click();
  await page.locator("#sleepHours").fill("7.5");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByText(/Check-in saved for/)).toBeVisible();

  await page.locator("#sleepHours").fill("30");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(
    page.getByText("Sleep must be between 0 and 24 hours."),
  ).toBeVisible();

  await page.goto("/progress");
  await expect(page.getByText(/you logged 1 check-in/)).toBeVisible();

  await page.goto("/journal");
  await page.locator("#content").fill("A private note from the journey test.");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByText("Entry saved.")).toBeVisible();
  await expect(
    page.getByText("A private note from the journey test."),
  ).toBeVisible();

  await bookFirstOpenTime(page);
  await expect(
    page.getByText("Pending", { exact: true }).first(),
  ).toBeVisible();

  await page.goto("/notifications");
  await expect(page.getByText("Appointment requested")).toBeVisible();
});

test("a booked time can be cancelled by the student and is then released", async ({
  page,
}) => {
  await signUp(page, "Cancel Student", uniqueEmail("cancel"));
  // The last open date is well outside the 24-hour cancellation window, so cancelling is allowed.
  await bookFirstOpenTime(page, true);
  await page.getByRole("button", { name: "Cancel appointment" }).click();
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(
    page.getByText(
      "Appointment cancelled. The time is open to other students again.",
    ),
  ).toBeVisible();
});

test("the journal stays private: another student cannot see it", async ({
  page,
}) => {
  const secretText = `Private journal ${Date.now()}`;
  await signUp(page, "First Student", uniqueEmail("first"));
  await page.goto("/journal");
  await page.locator("#content").fill(secretText);
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByText("Entry saved.")).toBeVisible();
  await logOut(page);

  await signUp(page, "Second Student", uniqueEmail("second"));
  await page.goto("/journal");
  await expect(page.getByText("No entries yet")).toBeVisible();
  await expect(page.getByText(secretText)).toHaveCount(0);
});

test("the wellness check says it is not available yet, rather than inventing questions", async ({
  page,
}) => {
  await signUp(page, "Check Student", uniqueEmail("check"));
  await page.goto("/questionnaire/placeholder-wellbeing");
  await expect(page.getByText("Not available yet")).toBeVisible();
});

test("the privacy notice is reachable from the sign-up page", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByRole("link", { name: "privacy notice", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Privacy notice" }),
  ).toBeVisible();
});
