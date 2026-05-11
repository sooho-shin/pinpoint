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
