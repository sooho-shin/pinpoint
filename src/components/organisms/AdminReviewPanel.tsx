import { Button } from "@/components/atoms/Button";
import { ClueRow } from "@/components/molecules/ClueRow";

export function AdminReviewPanel() {
  return (
    <section className="surface p-6">
      <h2 className="text-[22px] font-bold leading-[30px]">검토</h2>
      <div className="mt-5 rounded-md border border-[var(--border)] px-4">
        <ClueRow index={1} clue="자동 검증 통과" />
        <ClueRow index={2} clue="운영자 검토 필요" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button type="button" disabled>예약</Button>
        <Button type="button" variant="secondary" disabled>반려</Button>
      </div>
    </section>
  );
}
