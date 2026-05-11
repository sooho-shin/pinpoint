import { clsx } from "clsx";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" }) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-[92px] items-center rounded px-2 py-1 text-xs font-semibold",
        tone === "success" && "bg-green-50 text-[var(--success)]",
        tone === "warning" && "bg-amber-50 text-[var(--warning)]",
        tone === "neutral" && "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
      )}
    >
      {children}
    </span>
  );
}
