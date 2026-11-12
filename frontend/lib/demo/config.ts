// Demo mode runs the whole app in the browser with fictional data. No request leaves the browser.
// Turn it on with NEXT_PUBLIC_DEMO_MODE=true (for example in the Vercel project settings).
// When the variable is unset, the app talks to the real backend as before.
// Note: NEXT_PUBLIC_ values are read at build time, so redeploy after changing the variable.

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Shown on the login page. Fictional, and only used by the in-browser demo.
export const DEMO_PASSWORD = "demo1234";

export type DemoAccount = {
  label: string;
  email: string;
  role: "student" | "psychologist" | "admin";
  description: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Student",
    email: "student@mindbridge.demo",
    role: "student",
    description: "Mood check-ins, journal, booking, resources",
  },
  {
    label: "Psychologist",
    email: "amara@mindbridge.demo",
    role: "psychologist",
    description: "Dr. Amara Osei: availability and appointments",
  },
  {
    label: "Administrator",
    email: "admin@mindbridge.com",
    role: "admin",
    description: "Verification, resources, settings, audit log",
  },
];
