import { Button, ButtonLink } from "@/components/atoms/Button";

export function ShareActionGroup({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  return (
    <div className="grid w-full max-w-[278px] grid-cols-2 gap-[14px]">
      <Button type="button" onClick={onCopy}>{copied ? "공유 완료" : "결과 공유"}</Button>
      <ButtonLink href="/ranking" variant="secondary">랭킹 보기</ButtonLink>
    </div>
  );
}
