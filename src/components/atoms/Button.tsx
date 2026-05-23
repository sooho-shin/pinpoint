import { clsx } from "clsx";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const buttonClass = {
  primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-pressed)]",
  secondary: "bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-white",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
};

const buttonBaseClass =
  "focus-ring inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition";

function buttonClasses(variant: NonNullable<ButtonProps["variant"]>, className?: string) {
  return clsx(buttonBaseClass, buttonClass[variant], className);
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        buttonClasses(variant, className),
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
      {...props}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function ButtonLink({ className, variant = "primary", href, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses(variant, className)}
      href={href}
      {...props}
    />
  );
}

export function ButtonAnchor({ className, variant = "primary", href, ...props }: ButtonLinkProps) {
  return <a className={buttonClasses(variant, className)} href={href} {...props} />;
}
