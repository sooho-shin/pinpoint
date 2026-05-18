import type { Metadata } from "next";
import { LegalTemplate } from "@/components/templates/LegalTemplate";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "Narrow 개인정보처리방침",
  alternates: {
    canonical: "/privacy"
  }
};

export default function PrivacyPage() {
  return (
    <LegalTemplate
      eyebrow="Policy"
      title="개인정보처리방침"
      description="시행일: 2026년 5월 17일"
      sections={[
        {
          title: "수집하는 정보",
          paragraphs: [
            "Narrow는 오늘의 퍼즐 풀이, 랭킹 표시, 로그인 상태 유지를 위해 필요한 최소한의 정보를 처리합니다.",
            "Google 로그인 시 Supabase Auth를 통해 사용자 식별자, 이름, 프로필 이미지 등 Google 계정에서 제공되는 기본 프로필 정보가 처리될 수 있습니다.",
            "비로그인 플레이에서는 같은 브라우저의 오늘 풀이를 구분하기 위한 익명 세션 정보가 사용될 수 있습니다."
          ]
        },
        {
          title: "이용 목적",
          paragraphs: [
            "수집한 정보는 퍼즐 진행 상태 저장, 정답 제출 처리, 일일 랭킹 등록, 부정 이용 방지, 서비스 품질 개선에 사용됩니다.",
            "랭킹에는 이메일이나 제출한 오답이 공개되지 않으며, 닉네임과 풀이 기록에 필요한 제한된 정보만 표시됩니다."
          ]
        },
        {
          title: "분석과 광고",
          paragraphs: [
            "서비스는 방문 통계와 이용 흐름을 파악하기 위해 Google Analytics를 사용할 수 있습니다.",
            "광고 수익화를 위해 Google AdSense가 사용될 수 있으며, Google은 광고 제공과 측정을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다.",
            "사용자는 브라우저 설정 또는 Google 광고 설정을 통해 개인 맞춤 광고와 쿠키 사용을 관리할 수 있습니다."
          ]
        },
        {
          title: "보관과 삭제",
          paragraphs: [
            "서비스 운영에 필요한 정보는 목적 달성에 필요한 기간 동안 보관됩니다.",
            "계정 및 개인정보 삭제 요청은 문의 페이지의 연락 경로를 통해 요청할 수 있습니다."
          ]
        }
      ]}
    />
  );
}
