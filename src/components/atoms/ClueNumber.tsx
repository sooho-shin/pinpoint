export function ClueNumber({ value }: { value: number }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--surface-muted)] text-sm font-bold text-[var(--accent)]">
      {value}
    </span>
  );
}
