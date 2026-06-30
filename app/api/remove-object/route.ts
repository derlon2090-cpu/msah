import { NextResponse } from "next/server";
import { getCurrentCodeSession } from "@/lib/code-auth";
import { createProcessedImageAfterSuccess } from "@/lib/images";
import { isStorageConfigured, parseImageDataUrl, readImageDimensions } from "@/lib/storage";

export const dynamic = "force-dynamic";

function assertMatchingImageSizes(originalDataUrl: string, resultDataUrl: string, maskDataUrl: string) {
  const original = parseImageDataUrl(originalDataUrl);
  const result = parseImageDataUrl(resultDataUrl);
  const mask = parseImageDataUrl(maskDataUrl);

  const originalSize = readImageDimensions(original.buffer, original.contentType);
  const resultSize = readImageDimensions(result.buffer, result.contentType);
  const maskSize = readImageDimensions(mask.buffer, mask.contentType);

  const sameResult = originalSize.width === resultSize.width && originalSize.height === resultSize.height;
  const sameMask = originalSize.width === maskSize.width && originalSize.height === maskSize.height;

  if (!sameResult || !sameMask) {
    throw new Error(
      `Invalid mask size. original=${originalSize.width}x${originalSize.height}, result=${resultSize.width}x${resultSize.height}, mask=${maskSize.width}x${maskSize.height}`
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const originalDataUrl = String(body.originalDataUrl ?? body.originalUrl ?? "");
  const resultDataUrl = String(body.resultDataUrl ?? "");
  const maskDataUrl = String(body.maskDataUrl ?? "");
  const imageId = String(body.imageId ?? "");
  const jobId = String(body.jobId ?? `job_${Date.now()}`);
  const maskId = String(body.maskId ?? `${jobId}_mask`);

  if (!originalDataUrl || !resultDataUrl || !maskDataUrl) {
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
    assertMatchingImageSizes(originalDataUrl, resultDataUrl, maskDataUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid image or mask data" },
      { status: 400 }
    );
  }

  try {
    const { image, usage } = await createProcessedImageAfterSuccess({
      activationCodeId: session.activationCodeId,
      originalDataUrl,
      resultDataUrl,
      jobId
    });

    const finalProcessedUrl = `${image.resultImageUrl}?job=${encodeURIComponent(jobId)}&image=${encodeURIComponent(imageId)}&mask=${encodeURIComponent(maskId)}`;

    return NextResponse.json({
      ok: true,
      resultUrl: image.resultImageUrl,
      finalProcessedUrl,
      imageId,
      jobId,
      maskId,
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
