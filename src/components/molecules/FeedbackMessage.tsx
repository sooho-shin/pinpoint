import { StatusDot } from "@/components/atoms/StatusDot";

export function FeedbackMessage({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return (
    <p className="flex items-start gap-2 text-sm leading-5 text-[var(--text-secondary)]">
      <span className="mt-[7px]">
        <StatusDot tone={tone} />
      </span>
      <span>{children}</span>
    </p>
  );
}

export function FeedbackToast({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed inset-x-4 bottom-5 z-[60] mx-auto flex max-w-[342px] items-start gap-2 rounded-md bg-[var(--text-primary)] px-4 py-3 text-sm font-semibold leading-5 text-white shadow-[0_16px_40px_rgba(32,33,36,0.24)]"
    >
      <span className="mt-[7px]">
        <StatusDot tone="danger" />
      </span>
      <span>{children}</span>
    </div>
  );
}
