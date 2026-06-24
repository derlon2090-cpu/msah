import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createCode, getAllCodes, getImages, getSettings } from "@/lib/store";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const codes = await getAllCodes();
  const images = await getImages();
  const stats = {
    totalCodes: codes.length,
    activeCodes: codes.filter((item) => item.is_active).length,
    expiredCodes: codes.filter((item) => item.expires_at && new Date(item.expires_at).getTime() < Date.now()).length,
    totalImages: images.length,
    remainingUses: codes.reduce((sum, item) => sum + item.remaining_uses, 0)
  };
  return NextResponse.json({ codes, stats, images, settings: await getSettings() });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.code || !body.total_uses) {
    return NextResponse.json({ error: "الكود وعدد مرات الاستخدام مطلوبان" }, { status: 400 });
  }

  const code = await createCode({
    code: String(body.code),
    customer_name: body.customer_name ? String(body.customer_name) : null,
    total_uses: Number(body.total_uses),
    remaining_uses: Number(body.remaining_uses ?? body.total_uses),
    expires_at: body.expires_at || null,
    is_active: Boolean(body.is_active),
    notes: body.notes ? String(body.notes) : null
  });

  return NextResponse.json({ code });
}
