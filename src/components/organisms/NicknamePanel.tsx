import { Button } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";

export function NicknamePanel({
  action,
  defaultNickname,
  error
}: {
  action: (formData: FormData) => Promise<void>;
  defaultNickname?: string;
  error?: string;
}) {
  return (
    <section className="surface min-h-[406px] p-6">
      <h2 className="text-[22px] font-bold leading-[30px]">닉네임 설정</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">랭킹과 공유 화면에 표시될 이름입니다.</p>
      <form action={action} className="mt-8 space-y-3">
        <TextInput name="nickname" defaultValue={defaultNickname} minLength={2} maxLength={12} placeholder="닉네임" required />
        <Button type="submit">저장</Button>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </form>
    </section>
  );
}
