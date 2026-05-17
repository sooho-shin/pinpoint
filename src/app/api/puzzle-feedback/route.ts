import { NextResponse, type NextRequest } from "next/server";
import { writePuzzleFeedback } from "@/lib/puzzle/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await writePuzzleFeedback({
      reaction: String(body?.reaction ?? ""),
      comment: String(body?.comment ?? "")
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "평가를 저장하지 못했습니다." }, { status: 500 });
  }
}
