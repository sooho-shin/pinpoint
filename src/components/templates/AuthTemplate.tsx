import { GameHeader } from "@/components/organisms/GameHeader";
import { NicknamePanel } from "@/components/organisms/NicknamePanel";
import { SignInPanel } from "@/components/organisms/SignInPanel";

type AuthTemplateProps =
  | {
      kind: "signin";
      action: () => Promise<void>;
    }
  | {
      kind: "nickname";
      action: (formData: FormData) => Promise<void>;
      defaultNickname?: string;
      error?: string;
    };

export function AuthTemplate(props: AuthTemplateProps) {
  const eyebrow = props.kind === "signin" ? "Account" : "Profile";
  const title = props.kind === "signin" ? "로그인" : "닉네임";

  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow={eyebrow} title={title} />
        {props.kind === "signin" ? (
          <SignInPanel action={props.action} />
        ) : (
          <NicknamePanel action={props.action} defaultNickname={props.defaultNickname} error={props.error} />
        )}
      </div>
    </main>
  );
}
