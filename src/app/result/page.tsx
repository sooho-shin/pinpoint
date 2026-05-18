import type { Metadata } from "next";
import { ResultTemplate } from "@/components/templates/ResultTemplate";

export const metadata: Metadata = {
  title: "결과",
  description: "Narrow 퍼즐 결과",
  robots: {
    index: false,
    follow: true
  }
};

export default async function ResultPage() {
  return <ResultTemplate />;
}
