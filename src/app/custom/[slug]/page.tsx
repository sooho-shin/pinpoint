import type { Metadata } from "next";
import { CustomPlayTemplate } from "@/components/templates/CustomPlayTemplate";

export const metadata: Metadata = {
  title: "공유 문제",
  description: "공유받은 Narrow 커스텀 문제를 풀어보세요.",
  robots: {
    index: false,
    follow: false
  }
};

function safeSlug(value: string) {
  return /^[0-9A-Za-z_-]{12,64}$/.test(value) ? value : "invalid";
}

export default async function CustomPlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CustomPlayTemplate slug={safeSlug(slug)} />;
}
