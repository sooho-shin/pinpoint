import type { Metadata } from "next";
import { CustomPlayTemplate } from "@/components/templates/CustomPlayTemplate";

function safeSlug(value: string) {
  return /^[0-9A-Za-z_-]{12,64}$/.test(value) ? value : "invalid";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const safePathSlug = safeSlug(slug);
  const canonical = `/custom/${safePathSlug}`;

  return {
    title: "공유 문제",
    description: "공유받은 Narrow 커스텀 문제를 단서 순서대로 풀고 결과를 비교해 보세요.",
    alternates: {
      canonical
    },
    robots: {
      index: true,
      follow: true
    },
    openGraph: {
      title: "Narrow 공유 문제",
      description: "친구가 만든 한국어 연상 퍼즐을 단서 순서대로 풀어보세요.",
      url: canonical,
      type: "website"
    }
  };
}

export default async function CustomPlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CustomPlayTemplate slug={safeSlug(slug)} />;
}
