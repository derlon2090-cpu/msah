import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { normalizeCode } from "@/lib/code-auth";

function serializeCode(code: {
  id: string;
  code: string;
  customerName: string | null;
  totalUses: number;
  remainingUses: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: code.id,
    code: code.code,
    customer_name: code.customerName,
    total_uses: code.totalUses,
    remaining_uses: code.remainingUses,
    expires_at: code.expiresAt?.toISOString() ?? null,
    is_active: code.isActive,
    notes: null,
    created_at: code.createdAt.toISOString(),
    updated_at: code.updatedAt.toISOString()
  };
}

function serializeImage(image: {
  id: string;
  activationCodeId: string;
  originalImageUrl: string;
  resultImageUrl: string;
  originalStorageKey: string;
  resultStorageKey: string;
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
    original_storage_key: image.originalStorageKey,
    result_storage_key: image.resultStorageKey,
    created_at: image.createdAt.toISOString(),
    expires_at: image.expiresAt.toISOString(),
    deleted_at: image.deletedAt?.toISOString() ?? null
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const [codesRaw, imagesRaw] = await Promise.all([
    prisma.activationCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.processedImage.findMany({ orderBy: { createdAt: "desc" } })
  ]);
  const codes = codesRaw.map(serializeCode);
  const images = imagesRaw.map(serializeImage);

  const stats = {
    totalCodes: codes.length,
    activeCodes: codes.filter((item) => item.is_active).length,
    expiredCodes: codes.filter((item) => item.expires_at && new Date(item.expires_at).getTime() < Date.now()).length,
    totalImages: images.filter((item) => !item.deleted_at).length,
    remainingUses: codes.reduce((sum, item) => sum + item.remaining_uses, 0)
  };

  return NextResponse.json({ codes, stats, images, settings: { max_image_mb: Number(process.env.MAX_IMAGE_MB ?? 25) } });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const totalUses = Number(body.total_uses);
  if (!body.code || !Number.isInteger(totalUses) || totalUses < 1) {
    return NextResponse.json({ error: "الكود وعدد مرات الاستخدام مطلوبان" }, { status: 400 });
  }

  const code = await prisma.activationCode.create({
    data: {
      code: normalizeCode(String(body.code)),
      customerName: body.customer_name ? String(body.customer_name) : null,
      totalUses,
      remainingUses: Number.isInteger(Number(body.remaining_uses)) ? Number(body.remaining_uses) : totalUses,
      expiresAt: body.expires_at ? new Date(String(body.expires_at)) : null,
      isActive: Boolean(body.is_active)
    }
  });

  return NextResponse.json({ code: serializeCode(code) });
}
