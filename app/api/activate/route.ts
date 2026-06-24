import { NextResponse } from "next/server";
import { getCodeByValue, isCodeUsable } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawCode = String(body.code ?? "").trim();
  if (!rawCode) return NextResponse.json({ error: "أدخل كود التفعيل" }, { status: 400 });

  const code = await getCodeByValue(rawCode);
  if (!code) return NextResponse.json({ error: "كود التفعيل غير موجود" }, { status: 404 });
  if (!code.is_active) return NextResponse.json({ error: "كود التفعيل غير نشط" }, { status: 403 });
  if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "انتهت صلاحية كود التفعيل" }, { status: 403 });
  }
  if (code.remaining_uses <= 0) {
    return NextResponse.json({ error: "لا توجد مرات استخدام متبقية" }, { status: 403 });
  }
  if (!isCodeUsable(code)) return NextResponse.json({ error: "كود التفعيل غير صالح" }, { status: 403 });

  const response = NextResponse.json({ code });
  response.cookies.set("activation_code", code.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
