import { GameHeader } from "@/components/organisms/GameHeader";
import { NicknamePanel } from "@/components/organisms/NicknamePanel";
import { SignInPanel } from "@/components/organisms/SignInPanel";

type AuthTemplateProps =
  | {
      kind: "signin";
      action: (formData: FormData) => Promise<void>;
      next?: string;
      error?: string;
    }
  | {
      kind: "nickname";
      action: (formData: FormData) => Promise<void>;
      defaultNickname?: string;
      error?: string;
      next?: string;
    };

export function AuthTemplate(props: AuthTemplateProps) {
  const eyebrow = props.kind === "signin" ? "Account" : "Profile";
  const title = props.kind === "signin" ? "로그인" : "닉네임";

  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow={eyebrow} title={title} />
        {props.kind === "signin" ? (
          <SignInPanel action={props.action} next={props.next} error={props.error} />
        ) : (
          <NicknamePanel action={props.action} defaultNickname={props.defaultNickname} error={props.error} next={props.next} />
        )}
      </div>
    </main>
  );
}
