import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-heading text-lg font-semibold"
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-lavender"
      >
        <span className="size-3 rounded-full bg-navy" />
      </span>
      MindBridge
    </Link>
  );
}
