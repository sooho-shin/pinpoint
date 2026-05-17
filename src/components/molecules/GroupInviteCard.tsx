import { Button } from "@/components/atoms/Button";

export function GroupInviteCard({
  inviteUrl,
  pending,
  message,
  onCreate,
  onCopy
}: {
  inviteUrl?: string;
  pending?: boolean;
  message?: string;
  onCreate: () => void;
  onCopy: () => void;
}) {
  return (
    <div id="group" className="muted-surface w-full p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">그룹 랭킹</div>
      <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">초대 링크로 들어온 사람들끼리 오늘 기록을 비교합니다.</p>
      {inviteUrl ? (
        <>
          <div className="mt-3 truncate rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-secondary)]">{inviteUrl}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={onCopy}>링크 복사</Button>
            <Button type="button" onClick={() => { window.location.href = inviteUrl; }}>보기</Button>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={onCreate} disabled={pending}>
            {pending ? "만드는 중" : "그룹 만들기"}
          </Button>
        </div>
      )}
      {message ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{message}</p> : null}
    </div>
  );
}
