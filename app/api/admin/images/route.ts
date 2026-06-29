import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { markImageDeleted } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "معرف الصورة مطلوب" }, { status: 400 });
  const deleted = await markImageDeleted(id);
  if (!deleted) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
