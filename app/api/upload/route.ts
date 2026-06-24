import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readCookieFromHeader } from "@/lib/admin-auth";
import { getCodeByValue, getSettings, isCodeUsable, saveDataUrl } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const image = String(body.image ?? "");
  if (!image.startsWith("data:image/")) {
    return NextResponse.json({ error: "صورة غير صالحة" }, { status: 400 });
  }

  const codeValue = readCookieFromHeader(request, "activation_code") ?? cookies().get("activation_code")?.value;
  const code = codeValue ? await getCodeByValue(codeValue) : null;
  if (!code || !isCodeUsable(code)) {
    return NextResponse.json({ error: "أدخل كود تفعيل صالح قبل رفع الصورة" }, { status: 403 });
  }

  const settings = await getSettings();
  const base64 = image.split(",")[1] ?? "";
  const sizeMb = (base64.length * 0.75) / 1024 / 1024;
  if (sizeMb > settings.max_image_mb) {
    return NextResponse.json({ error: `حجم الصورة يتجاوز ${settings.max_image_mb} ميجابايت` }, { status: 413 });
  }

  const url = await saveDataUrl(image, "original");
  return NextResponse.json({ url });
}
