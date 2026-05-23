"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";

const CONSENT_KEY = "narrow:analytics-consent";

export function AnalyticsConsent({ measurementId }: { measurementId?: string }) {
  const [consent, setConsent] = useState<"unknown" | "accepted" | "declined">("unknown");

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted" || saved === "declined") setConsent(saved);
  }, []);

  if (!measurementId || consent === "declined") return null;

  if (consent === "accepted") {
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', { anonymize_ip: true });
          `}
        </Script>
      </>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[390px] rounded-md border border-[var(--border)] bg-white p-4 shadow-[0_16px_40px_rgba(32,33,36,0.16)]">
      <p className="text-sm leading-5 text-[var(--text-secondary)]">
        방문 통계를 위해 Google Analytics를 사용할 수 있습니다. 허용하지 않아도 퍼즐은 그대로 이용할 수 있습니다.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, "declined");
            setConsent("declined");
          }}
        >
          거부
        </Button>
        <Button
          type="button"
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, "accepted");
            setConsent("accepted");
          }}
        >
          허용
        </Button>
      </div>
    </div>
  );
}
