import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readCookieFromHeader } from "@/lib/admin-auth";
import { deleteImage, getCodeByValue, getImages } from "@/lib/store";

export async function GET(request: Request) {
  const codeValue = readCookieFromHeader(request, "activation_code") ?? cookies().get("activation_code")?.value;
  const code = codeValue ? await getCodeByValue(codeValue) : null;
  if (!code) return NextResponse.json({ images: [], error: "لا يوجد كود مفعل" }, { status: 401 });
  const images = await getImages(code?.id);
  return NextResponse.json({ images });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "معرف الصورة مطلوب" }, { status: 400 });
  const codeValue = readCookieFromHeader(request, "activation_code") ?? cookies().get("activation_code")?.value;
  const code = codeValue ? await getCodeByValue(codeValue) : null;
  if (!code) return NextResponse.json({ error: "لا يوجد كود مفعل" }, { status: 401 });
  const ownedImages = await getImages(code.id);
  if (!ownedImages.some((image) => image.id === String(body.id))) {
    return NextResponse.json({ error: "غير مصرح بحذف هذه الصورة" }, { status: 403 });
  }
  await deleteImage(String(body.id));
  return NextResponse.json({ ok: true });
}
