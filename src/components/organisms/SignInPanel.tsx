import { GoogleSignInButton } from "@/components/atoms/GoogleSignInButton";
import { AuthStatusMessage } from "@/components/molecules/AuthStatusMessage";

export function SignInPanel({ action }: { action: () => Promise<void> }) {
  return (
    <section className="surface min-h-[360px] p-6">
      <h2 className="text-[22px] font-bold leading-[30px]">로그인</h2>
      <AuthStatusMessage />
      <form action={action} className="mt-8">
        <GoogleSignInButton />
      </form>
    </section>
  );
}
