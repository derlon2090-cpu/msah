import { NextResponse } from "next/server";
import { deleteExpiredImages } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const result = await deleteExpiredImages();
  return NextResponse.json({ ok: true, ...result });
}
