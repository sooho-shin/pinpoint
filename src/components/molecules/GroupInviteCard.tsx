import { Button } from "@/components/atoms/Button";

export function GroupInviteCard() {
  return (
    <div className="muted-surface w-[278px] p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">그룹 랭킹</div>
      <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">초대 링크 기반 그룹 랭킹은 다음 구현 범위입니다.</p>
      <div className="mt-4">
        <Button type="button" variant="secondary" disabled>준비 중</Button>
      </div>
    </div>
  );
}
