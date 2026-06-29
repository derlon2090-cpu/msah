import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { normalizeCode } from "@/lib/code-auth";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/ensure-db";

export const dynamic = "force-dynamic";

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

function parseDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("تاريخ انتهاء الكود غير صحيح");
  return date;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    await ensureDatabase();
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تحميل بيانات لوحة الأدمن" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    await ensureDatabase();
    const body = await request.json().catch(() => ({}));
    const codeValue = normalizeCode(String(body.code ?? ""));
    const totalUses = Number(body.total_uses);
    const remainingUses = body.remaining_uses === undefined || body.remaining_uses === ""
      ? totalUses
      : Number(body.remaining_uses);

    if (!codeValue) return NextResponse.json({ error: "كود التفعيل مطلوب" }, { status: 400 });
    if (!Number.isInteger(totalUses) || totalUses < 1) {
      return NextResponse.json({ error: "عدد مرات الاستخدام يجب أن يكون رقمًا أكبر من صفر" }, { status: 400 });
    }
    if (!Number.isInteger(remainingUses) || remainingUses < 0 || remainingUses > totalUses) {
      return NextResponse.json({ error: "الاستخدامات المتبقية يجب أن تكون بين 0 وإجمالي الاستخدامات" }, { status: 400 });
    }

    const code = await prisma.activationCode.create({
      data: {
        code: codeValue,
        customerName: body.customer_name ? String(body.customer_name).trim() : null,
        totalUses,
        remainingUses,
        expiresAt: parseDate(body.expires_at),
        isActive: body.is_active !== false
      }
    });

    return NextResponse.json({ code: serializeCode(code) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء الكود";
    const duplicate = message.includes("Unique constraint") || message.includes("activation_codes_code_key");
    return NextResponse.json({ error: duplicate ? "هذا الكود موجود مسبقًا" : message }, { status: duplicate ? 409 : 500 });
  }
}
