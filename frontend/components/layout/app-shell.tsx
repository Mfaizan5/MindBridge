"use client";

import {
  Bell,
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  LogOut,
  Menu,
  NotebookPen,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Stethoscope,
  Users,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: Record<Role, NavItem[]> = {
  student: [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/mood", label: "Mood Tracker", icon: Smile },
    {
      href: "/questionnaire/placeholder-wellbeing",
      label: "Wellness Check",
      icon: ClipboardList,
    },
    { href: "/progress", label: "My Progress", icon: LineChart },
    { href: "/resources", label: "Resources", icon: BookOpen },
    { href: "/psychologists", label: "Psychologists", icon: Stethoscope },
    { href: "/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/journal", label: "My Journal", icon: NotebookPen },
    { href: "/settings", label: "Profile & Settings", icon: Settings },
    { href: "/help", label: "Help & Safety", icon: LifeBuoy },
  ],
  psychologist: [
    {
      href: "/psychologist/workspace",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/psychologist/workspace/availability",
      label: "Availability",
      icon: Clock,
    },
    {
      href: "/psychologist/workspace/appointments",
      label: "Appointments",
      icon: CalendarDays,
    },
    { href: "/help", label: "Help & Safety", icon: LifeBuoy },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
    { href: "/admin/resources", label: "Resources", icon: FileText },
    { href: "/admin/settings", label: "Settings", icon: SlidersHorizontal },
    { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  ],
};

const HOME: Record<Role, string> = {
  student: "/dashboard",
  psychologist: "/psychologist/workspace",
  admin: "/admin",
};
const LABEL: Record<Role, string> = {
  student: "Student",
  psychologist: "Psychologist",
  admin: "Administrator",
};

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/psychologist/workspace")
    return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Loading({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div
      className="grid flex-1 place-items-center p-8 text-navy-soft"
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}

export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  // usePathname needs a Suspense boundary so static prerendering can stream past it.
  return (
    <Suspense fallback={<Loading />}>
      <ShellFrame role={role}>{children}</ShellFrame>
    </Suspense>
  );
}

function ShellFrame({ role, children }: { role: Role; children: ReactNode }) {
  const { ready, session, me, mine, actions } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Route guard. The backend enforces the same rules for every API call (Phase 4+).
  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (session.role !== role) router.replace(HOME[session.role]);
  }, [ready, session, role, pathname, router]);

  const authorised = ready && session?.role === role && me?.status === "active";
  if (!authorised)
    return (
      <Loading
        label={ready && !session ? "Please log in to continue." : undefined}
      />
    );

  const items = NAV[role];
  const primary = items.slice(0, 4);
  const rest = items.slice(4);
  const unread =
    role === "student" ? mine.notifications.filter((n) => !n.read).length : 0;

  const signOut = async () => {
    await actions.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between overflow-y-auto border-r border-border bg-white p-5 lg:flex">
        <div className="space-y-8">
          <Logo />
          <nav aria-label="Main">
            <ul className="space-y-1">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-navy/5",
                        active && "bg-lavender hover:bg-lavender",
                      )}
                    >
                      <item.icon
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="space-y-3 text-sm">
          {role === "student" && (
            <Link
              href="/notifications"
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 hover:bg-navy/5"
            >
              <Bell className="size-4" aria-hidden="true" />
              Notifications
              {unread > 0 && (
                <span className="ml-auto rounded-full bg-navy px-2 py-0.5 text-xs text-white">
                  {unread} new
                </span>
              )}
            </Link>
          )}
          <p className="px-3 text-navy-soft">
            Signed in as{" "}
            <span className="font-medium text-navy">{me?.name}</span>
            <span className="block text-xs">{LABEL[role]}</span>
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 lg:hidden">
          <Link href={HOME[role]} className="font-heading font-semibold">
            MindBridge
          </Link>
          <div className="flex items-center gap-1">
            {role === "student" && (
              <Link
                href="/notifications"
                className="relative grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-navy/5"
                aria-label={
                  unread > 0 ? `Notifications, ${unread} new` : "Notifications"
                }
              >
                <Bell className="size-5" aria-hidden="true" />
                {unread > 0 && (
                  <span
                    className="absolute right-2 top-2 size-2 rounded-full bg-navy"
                    aria-hidden="true"
                  />
                )}
              </Link>
            )}
            <span className="text-xs text-navy-soft">{LABEL[role]}</span>
            <button
              type="button"
              onClick={signOut}
              aria-label="Log out"
              title="Log out"
              className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-navy/5"
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Main mobile"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white lg:hidden"
      >
        {moreOpen && (
          <ul
            className="grid gap-1 border-b border-border p-3"
            id="mobile-more"
          >
            {rest.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium hover:bg-navy/5"
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 font-medium hover:bg-navy/5"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Log out
              </button>
            </li>
          </ul>
        )}
        <ul className="grid auto-cols-fr grid-flow-col">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] font-medium leading-tight",
                    active && "bg-lavender",
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          {rest.length > 0 && (
            <li>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="mobile-more"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
              >
                <Menu className="size-4" aria-hidden="true" />
                More
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
