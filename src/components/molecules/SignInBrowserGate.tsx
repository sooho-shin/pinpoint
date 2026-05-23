"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Button, ButtonAnchor } from "@/components/atoms/Button";
import { GoogleSignInButton } from "@/components/atoms/GoogleSignInButton";

const BLOCKED_IN_APP_BROWSER_PATTERNS = [
  /Threads/i,
  /Instagram/i,
  /FBAN|FBAV|FB_IAB/i,
  /KAKAOTALK/i,
  /Line\//i,
  /NAVER/i,
  /DaumApps/i
];

function isBlockedInAppBrowser(userAgent: string) {
  const knownInAppBrowser = BLOCKED_IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(userAgent));
  const iosWebView =
    /iPhone|iPad|iPod/i.test(userAgent) &&
    /AppleWebKit/i.test(userAgent) &&
    /Mobile/i.test(userAgent) &&
    !/Safari/i.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS/i.test(userAgent);
  const androidWebView = /; wv\)|Version\/\d+(?:\.\d+)? Chrome/i.test(userAgent);

  return knownInAppBrowser || iosWebView || androidWebView;
}

export function SignInBrowserGate({
  action,
  next = "/",
  error
}: {
  action: (formData: FormData) => Promise<void>;
  next?: string;
  error?: string;
}) {
  const [browserState, setBrowserState] = useState<"checking" | "blocked" | "allowed">("checking");
  const [currentUrl, setCurrentUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    setBrowserState(isBlockedInAppBrowser(window.navigator.userAgent) ? "blocked" : "allowed");
    setCurrentUrl(window.location.href);
  }, []);

  const openUrl = useMemo(() => currentUrl || "/", [currentUrl]);

  async function copyUrl() {
    if (!currentUrl) return;

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  if (browserState === "checking") {
    return (
      <div className="mt-8">
        <Button type="button" variant="secondary" className="h-12" disabled>
          로그인 환경 확인 중
        </Button>
      </div>
    );
  }

  if (browserState === "blocked") {
    return (
      <div className="mt-8 space-y-4">
        <div className="muted-surface p-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">브라우저에서 로그인해주세요</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Threads, Instagram, 카카오톡 같은 앱 안의 브라우저에서는 Google 로그인이 보안 정책으로 차단될 수 있습니다.
            아래 버튼이 같은 앱 안에서 다시 열리면 주소를 복사해 Safari나 Chrome 주소창에 붙여넣어 주세요.
          </p>
        </div>
        <div className="grid gap-3">
          <ButtonAnchor href={openUrl} target="_blank" rel="noreferrer" className="h-12">
            <ExternalLink aria-hidden="true" className="h-5 w-5" />
            외부 브라우저로 열기
          </ButtonAnchor>
          <Button type="button" variant="secondary" className="h-12" onClick={copyUrl}>
            <Link2 aria-hidden="true" className="h-5 w-5" />
            주소 복사
          </Button>
        </div>
        {copyState === "copied" ? (
          <p className="text-sm text-[var(--success)]">주소를 복사했습니다. Safari나 Chrome 주소창에 붙여넣어 주세요.</p>
        ) : null}
        {copyState === "failed" ? (
          <p className="text-sm text-[var(--danger)]">주소 복사에 실패했습니다. 상단 메뉴에서 외부 브라우저로 열어주세요.</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-3">
      <input type="hidden" name="next" value={next} />
      <GoogleSignInButton />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </form>
  );
}
