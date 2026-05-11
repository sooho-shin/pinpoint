import { clsx } from "clsx";

export function StatusDot({ tone = "neutral" }: { tone?: "neutral" | "success" | "warning" | "danger" }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-block h-2 w-2 rounded-full",
        tone === "neutral" && "bg-[var(--text-secondary)]",
        tone === "success" && "bg-[var(--success)]",
        tone === "warning" && "bg-[var(--warning)]",
        tone === "danger" && "bg-[var(--danger)]"
      )}
    />
  );
}
