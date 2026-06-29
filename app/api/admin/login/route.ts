import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSession, setAdminCookie } from "@/lib/admin-auth";

async function passwordMatches(password: string, configuredPassword: string) {
  if (configuredPassword.startsWith("$2a$") || configuredPassword.startsWith("$2b$") || configuredPassword.startsWith("$2y$")) {
    return bcrypt.compare(password, configuredPassword);
  }

  return password === configuredPassword;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    return NextResponse.json({ error: "بيانات الأدمن غير مضبوطة في ENV" }, { status: 500 });
  }

  const valid = email === adminEmail && (await passwordMatches(password, adminPasswordHash));
  if (!valid) return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });

  setAdminCookie(createAdminSession(email));
  return NextResponse.json({ ok: true });
}
