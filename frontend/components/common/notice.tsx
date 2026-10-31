import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Inline status message. "error" and "warning" use role="alert" so assistive technology announces them.
const TONES = {
  info: "border-sky-400/40 bg-sky text-navy",
  success: "border-mint bg-mint text-navy",
  warning: "border-blush bg-blush text-navy",
  error: "border-danger/40 bg-blush text-danger",
} as const;

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  const urgent = tone === "error" || tone === "warning";
  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
