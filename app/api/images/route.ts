import { NextResponse } from "next/server";
import { getCurrentCodeSession } from "@/lib/code-auth";
import { prisma } from "@/lib/db";
import { markImageDeleted } from "@/lib/images";

export const dynamic = "force-dynamic";

function serializeImage(image: {
  id: string;
  activationCodeId: string;
  originalImageUrl: string;
  resultImageUrl: string;
  createdAt: Date;
  expiresAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: image.id,
    activation_code_id: image.activationCodeId,
    original_image_url: image.originalImageUrl,
    result_image_url: image.resultImageUrl,
    original_url: image.originalImageUrl,
    result_url: image.resultImageUrl,
    created_at: image.createdAt.toISOString(),
    expires_at: image.expiresAt.toISOString(),
    deleted_at: image.deletedAt?.toISOString() ?? null
  };
}

export async function GET() {
  const session = await getCurrentCodeSession();
  if (!session) return NextResponse.json({ images: [], error: "لا يوجد كود مفعل" }, { status: 401 });

  const images = await prisma.processedImage.findMany({
    where: {
      activationCodeId: session.activationCodeId,
      deletedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ images: images.map(serializeImage) });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "معرف الصورة مطلوب" }, { status: 400 });

  const session = await getCurrentCodeSession();
  if (!session) return NextResponse.json({ error: "لا يوجد كود مفعل" }, { status: 401 });

  const deleted = await markImageDeleted(id, session.activationCodeId);
  if (!deleted) return NextResponse.json({ error: "الصورة غير موجودة أو غير مصرح بحذفها" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
