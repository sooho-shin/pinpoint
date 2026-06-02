import { clsx } from "clsx";

type LoadingSpinnerProps = {
  size?: "sm" | "md";
  label?: string;
  className?: string;
};

const sizeClass = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-[3px]"
};

export function LoadingSpinner({ size = "md", label = "불러오는 중", className }: LoadingSpinnerProps) {
  return (
    <span role="status" aria-label={label} className={clsx("inline-flex shrink-0 items-center justify-center", className)}>
      <span className={clsx("animate-spin rounded-full border-current border-t-transparent", sizeClass[size])} />
    </span>
  );
}
