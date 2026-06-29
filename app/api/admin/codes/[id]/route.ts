import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { normalizeCode } from "@/lib/code-auth";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/ensure-db";

export const dynamic = "force-dynamic";

function parseDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("تاريخ انتهاء الكود غير صحيح");
  return date;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    await ensureDatabase();
    const body = await request.json().catch(() => ({}));

    const data = {
      ...(body.code !== undefined ? { code: normalizeCode(String(body.code)) } : {}),
      ...(body.customer_name !== undefined ? { customerName: body.customer_name ? String(body.customer_name).trim() : null } : {}),
      ...(body.total_uses !== undefined ? { totalUses: Number(body.total_uses) } : {}),
      ...(body.remaining_uses !== undefined ? { remainingUses: Number(body.remaining_uses) } : {}),
      ...(body.expires_at !== undefined ? { expiresAt: parseDate(body.expires_at) } : {}),
      ...(body.is_active !== undefined ? { isActive: Boolean(body.is_active) } : {})
    };

    const code = await prisma.activationCode.update({ where: { id: params.id }, data });
    return NextResponse.json({ code });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تعديل الكود" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    await ensureDatabase();
    await prisma.activationCode.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حذف الكود" },
      { status: 500 }
    );
  }
}
