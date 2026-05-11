import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--accent)] transition hover:bg-[var(--surface-muted)]",
        className
      )}
      {...props}
    />
  );
}
