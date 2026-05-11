import { ClueRow } from "@/components/molecules/ClueRow";

export function AdminCandidateCard() {
  const clues = ["경계", "통과", "도장", "비자", "여권"];
  return (
    <section className="surface p-6">
      <div className="text-xs font-semibold text-[var(--text-secondary)]">Candidate</div>
      <h2 className="mt-1 text-[22px] font-bold leading-[30px]">출입국</h2>
      <div className="mt-5 rounded-md border border-[var(--border)] px-4">
        {clues.map((clue, index) => (
          <ClueRow key={clue} index={index + 1} clue={clue} />
        ))}
      </div>
    </section>
  );
}
