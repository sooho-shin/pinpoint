import { NextResponse } from "next/server";

export function GET() {
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? "ca-pub-4621241846705196";

  const publisherId = adsenseClient.replace(/^ca-/, "");

  return new NextResponse(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}
