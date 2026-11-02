import { expect, test } from "@playwright/test";
import {
  adminLogIn,
  ADMIN_EMAIL,
  logIn,
  logOut,
  NEW_PASSWORD,
  signUp,
  uniqueEmail,
} from "./helpers";

test("the sign-up page offers student and psychologist, and not administrator", async ({
  page,
}) => {
  await page.goto("/signup");
  await expect(page.getByRole("radio", { name: "Student" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Psychologist" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /admin/i })).toHaveCount(0);
});

test("a psychologist can sign up, lands on the workspace, and is shown as not yet verified", async ({
  page,
}) => {
  await signUp(page, "New Psychologist", uniqueEmail("newpsy"), "Psychologist");
  await expect(page.getByText("Pending administrator review")).toBeVisible();
});

test("a student sign-up still goes to the student dashboard", async ({
  page,
}) => {
  await signUp(page, "New Student", uniqueEmail("newstudent"));
});

test("a psychologist account cannot log in through the student option, but can through the psychologist option", async ({
  page,
}) => {
  const email = uniqueEmail("rolelogin");
  await signUp(page, "Role Check Psychologist", email, "Psychologist");
  await logOut(page);

  await logIn(page, email, NEW_PASSWORD, "Student");
  await expect(
    page.getByText("does not belong to a student account"),
  ).toBeVisible();

  await logIn(page, email, NEW_PASSWORD, "Psychologist");
  await expect(page).toHaveURL(/\/psychologist\/workspace$/);
});

test("the administrator option refuses a wrong password, refuses a student account, and accepts the correct password", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill("wrong-password");
  await page
    .getByRole("radio", { name: "Administrator" })
    .click({ force: true });
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();

  await adminLogIn(page);
});
