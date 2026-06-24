import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getPricing, getSettings, updatePricing, updateSettings } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ plans: await getPricing(), settings: await getSettings() });
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const plans = Array.isArray(body.plans) ? body.plans : [];
  const settings = body.settings ? await updateSettings({ max_image_mb: Number(body.settings.max_image_mb) || 25 }) : await getSettings();
  return NextResponse.json({ plans: await updatePricing(plans), settings });
}
