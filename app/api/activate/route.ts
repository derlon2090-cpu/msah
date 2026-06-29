import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createCodeSession, isActivationCodeUsable, normalizeCode } from "@/lib/code-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawCode = normalizeCode(String(body.code ?? ""));
  if (!rawCode) return NextResponse.json({ error: "أدخل كود التفعيل" }, { status: 400 });

  const code = await prisma.activationCode.findUnique({ where: { code: rawCode } });
  if (!code) return NextResponse.json({ error: "كود التفعيل غير موجود" }, { status: 404 });
  if (!code.isActive) return NextResponse.json({ error: "كود التفعيل غير نشط" }, { status: 403 });
  if (code.expiresAt && code.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "انتهت صلاحية كود التفعيل" }, { status: 403 });
  }
  if (code.remainingUses <= 0) {
    return NextResponse.json({ error: "لا توجد مرات استخدام متبقية" }, { status: 403 });
  }
  if (!isActivationCodeUsable(code)) return NextResponse.json({ error: "كود التفعيل غير صالح" }, { status: 403 });

  await createCodeSession(code.id);

  return NextResponse.json({
    code: {
      id: code.id,
      total_uses: code.totalUses,
      remaining_uses: code.remainingUses
    }
  });
}
