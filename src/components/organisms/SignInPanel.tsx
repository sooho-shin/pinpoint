import { GoogleSignInButton } from "@/components/atoms/GoogleSignInButton";
import { AuthStatusMessage } from "@/components/molecules/AuthStatusMessage";

export function SignInPanel({
  action,
  next = "/",
  error
}: {
  action: (formData: FormData) => Promise<void>;
  next?: string;
  error?: string;
}) {
  return (
    <section className="surface min-h-[360px] p-6">
      <h2 className="text-[22px] font-bold leading-[30px]">로그인</h2>
      <AuthStatusMessage />
      <form action={action} className="mt-8 space-y-3">
        <input type="hidden" name="next" value={next} />
        <GoogleSignInButton />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </form>
    </section>
  );
}
