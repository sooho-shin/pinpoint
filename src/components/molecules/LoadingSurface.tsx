import { clsx } from "clsx";
import { LoadingSpinner } from "@/components/atoms/LoadingSpinner";

type LoadingSurfaceProps = {
  message: string;
  minHeightClass?: string;
};

export function LoadingSurface({ message, minHeightClass = "min-h-[590px]" }: LoadingSurfaceProps) {
  return (
    <section className={clsx("surface flex items-center justify-center p-6", minHeightClass)}>
      <div className="flex flex-col items-center gap-3 text-center text-sm font-semibold text-[var(--text-secondary)]">
        <LoadingSpinner />
        <span>{message}</span>
      </div>
    </section>
  );
}
