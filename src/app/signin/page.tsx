import { AuthTemplate } from "@/components/templates/AuthTemplate";
import { signInWithGoogle } from "@/app/signin/actions";

export default async function SignInPage() {
  return <AuthTemplate kind="signin" action={signInWithGoogle} />;
}
