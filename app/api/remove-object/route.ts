import { NextResponse } from "next/server";
import { addProcessedImage, decrementUse, getCodeByValue, isCodeUsable, saveDataUrl } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawCode = String(body.code ?? "");
  const originalUrl = String(body.originalUrl ?? "");
  const resultDataUrl = String(body.resultDataUrl ?? "");

  if (!rawCode || !resultDataUrl) {
    return NextResponse.json({ error: "البيانات غير مكتملة" }, { status: 400 });
  }

  const code = await getCodeByValue(rawCode);
  if (!code || !isCodeUsable(code)) {
    return NextResponse.json({ error: "كود التفعيل غير صالح أو لا توجد مرات استخدام متبقية" }, { status: 403 });
  }

  try {
    const resultUrl = await saveDataUrl(resultDataUrl, "result");
    await addProcessedImage({
      activation_code_id: code.id,
      original_url: originalUrl || resultUrl,
      result_url: resultUrl
    });
    const usage = await decrementUse(code.id);
    return NextResponse.json({ ok: true, resultUrl, usage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "فشلت المعالجة ولم يتم خصم استخدام" },
      { status: 500 }
    );
  }
}
