import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { normalizeCode } from "@/lib/code-auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  const data = {
    ...(body.code !== undefined ? { code: normalizeCode(String(body.code)) } : {}),
    ...(body.customer_name !== undefined ? { customerName: body.customer_name ? String(body.customer_name) : null } : {}),
    ...(body.total_uses !== undefined ? { totalUses: Number(body.total_uses) } : {}),
    ...(body.remaining_uses !== undefined ? { remainingUses: Number(body.remaining_uses) } : {}),
    ...(body.expires_at !== undefined ? { expiresAt: body.expires_at ? new Date(String(body.expires_at)) : null } : {}),
    ...(body.is_active !== undefined ? { isActive: Boolean(body.is_active) } : {})
  };

  const code = await prisma.activationCode.update({ where: { id: params.id }, data });
  return NextResponse.json({ code });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  await prisma.activationCode.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
