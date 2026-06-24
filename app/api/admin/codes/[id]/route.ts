import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { deleteCode, updateCode } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const code = await updateCode(params.id, body);
  return NextResponse.json({ code });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  await deleteCode(params.id);
  return NextResponse.json({ ok: true });
}
