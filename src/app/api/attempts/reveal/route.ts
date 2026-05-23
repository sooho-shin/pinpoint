import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { revealNextClue } from "@/lib/puzzle/api";

export async function POST() {
  try {
    return NextResponse.json(await revealNextClue());
  } catch (error) {
    logRouteError("api/attempts/reveal", error);
    return NextResponse.json({ error: "단서를 열지 못했습니다." }, { status: 500 });
  }
}
