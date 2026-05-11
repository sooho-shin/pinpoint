import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "focus-ring h-14 w-full rounded-md border border-[var(--border)] bg-white px-4 text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]",
        className
      )}
      {...props}
    />
  );
}
