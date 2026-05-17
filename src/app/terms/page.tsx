import type { Metadata } from "next";
import { LegalTemplate } from "@/components/templates/LegalTemplate";

export const metadata: Metadata = {
  title: "이용약관",
  description: "Pinpoint 이용약관"
};

export default function TermsPage() {
  return (
    <LegalTemplate
      eyebrow="Terms"
      title="이용약관"
      description="시행일: 2026년 5월 17일"
      sections={[
        {
          title: "서비스 목적",
          paragraphs: [
            "Pinpoint는 매일 공개되는 한국어 연상 퍼즐을 플레이하고 결과를 공유할 수 있는 웹 서비스입니다.",
            "서비스 내용과 제공 방식은 운영 상황에 따라 변경될 수 있습니다."
          ]
        },
        {
          title: "사용자 책임",
          paragraphs: [
            "사용자는 다른 사람을 사칭하거나, 자동화된 요청으로 서비스를 방해하거나, 랭킹을 조작하는 행위를 해서는 안 됩니다.",
            "닉네임과 1등 메시지에는 타인의 권리 침해, 혐오 표현, 불법 정보, 광고성 문구를 입력할 수 없습니다."
          ]
        },
        {
          title: "콘텐츠와 랭킹",
          paragraphs: [
            "퍼즐, 단서, 화면 구성 등 서비스 콘텐츠의 권리는 Pinpoint 또는 정당한 권리자에게 있습니다.",
            "랭킹과 기록은 기술적 오류, 부정 이용, 운영상 필요가 있을 때 수정 또는 삭제될 수 있습니다."
          ]
        },
        {
          title: "광고와 외부 서비스",
          paragraphs: [
            "서비스에는 Google Analytics, Google AdSense, Supabase 등 외부 서비스가 포함될 수 있습니다.",
            "외부 서비스 이용에는 각 제공자의 약관과 정책이 함께 적용될 수 있습니다."
          ]
        }
      ]}
    />
  );
}
