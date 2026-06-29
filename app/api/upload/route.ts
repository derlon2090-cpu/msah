import { NextResponse } from "next/server";
import { getCurrentCodeSession } from "@/lib/code-auth";
import { parseImageDataUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const image = String(body.image ?? "");
  const session = await getCurrentCodeSession();
  if (!session) return NextResponse.json({ error: "أدخل كود تفعيل صالح قبل رفع الصورة" }, { status: 403 });

  try {
    const parsed = parseImageDataUrl(image);
    const maxImageMb = Number(process.env.MAX_IMAGE_MB ?? 25);
    const sizeMb = parsed.buffer.byteLength / 1024 / 1024;
    if (sizeMb > maxImageMb) {
      return NextResponse.json({ error: `حجم الصورة يتجاوز ${maxImageMb} ميجابايت` }, { status: 413 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "صورة غير صالحة" }, { status: 400 });
  }
}
