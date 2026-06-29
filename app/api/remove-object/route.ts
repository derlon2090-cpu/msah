import { NextResponse } from "next/server";
import { getCurrentCodeSession } from "@/lib/code-auth";
import { createProcessedImageAfterSuccess } from "@/lib/images";
import { isStorageConfigured } from "@/lib/storage";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const originalDataUrl = String(body.originalDataUrl ?? body.originalUrl ?? "");
  const resultDataUrl = String(body.resultDataUrl ?? "");

  if (!originalDataUrl || !resultDataUrl) {
    return NextResponse.json({ error: "البيانات غير مكتملة" }, { status: 400 });
  }

  const session = await getCurrentCodeSession();
  if (!session) {
    return NextResponse.json(
      { error: "كود التفعيل غير صالح أو لا توجد مرات استخدام متبقية" },
      { status: 403 }
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "إعدادات تخزين الصور غير مكتملة في Vercel. أضف متغيرات R2/S3 ثم أعد النشر." },
      { status: 500 }
    );
  }

  try {
    const { image, usage } = await createProcessedImageAfterSuccess({
      activationCodeId: session.activationCodeId,
      originalDataUrl,
      resultDataUrl
    });

    return NextResponse.json({
      ok: true,
      resultUrl: image.resultImageUrl,
      image,
      usage: {
        id: usage.id,
        total_uses: usage.totalUses,
        remaining_uses: usage.remainingUses
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "فشلت المعالجة ولم يتم خصم استخدام" },
      { status: 500 }
    );
  }
}
