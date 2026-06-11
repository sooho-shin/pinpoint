import type { Metadata } from "next";
import { CustomCreateTemplate } from "@/components/templates/CustomCreateTemplate";

export const metadata: Metadata = {
  title: "커스텀 문제 만들기",
  description: "정답과 단서 5개로 공유 가능한 Narrow 커스텀 게임을 만드세요.",
  robots: {
    index: false,
    follow: true
  }
};

export default function CustomNewPage() {
  return <CustomCreateTemplate />;
}
