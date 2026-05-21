import { AuthStatusMessage } from "@/components/molecules/AuthStatusMessage";
import { SignInBrowserGate } from "@/components/molecules/SignInBrowserGate";

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
      <SignInBrowserGate action={action} next={next} error={error} />
    </section>
  );
}
