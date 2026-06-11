import type { Metadata } from "next";
import { CustomManageTemplate } from "@/components/templates/CustomManageTemplate";

export const metadata: Metadata = {
  title: "커스텀 게임 관리",
  description: "Narrow 커스텀 게임 공유 상태를 관리합니다.",
  robots: {
    index: false,
    follow: false
  }
};

function safeToken(value: string) {
  return /^[0-9A-Za-z_-]{24,96}$/.test(value) ? value : "invalid";
}

export default async function CustomManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CustomManageTemplate token={safeToken(token)} />;
}
