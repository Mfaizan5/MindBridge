import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = NonNullable<Parameters<typeof buttonVariants>[0]>["variant"];

// A link styled as a button, so navigation stays a real link for keyboard and screen-reader users.
export function ButtonLink({
  variant = "default",
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: "default" | "sm" | "lg";
}) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
