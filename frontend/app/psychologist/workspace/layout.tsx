import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function PsychologistLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell role="psychologist">{children}</AppShell>;
}
