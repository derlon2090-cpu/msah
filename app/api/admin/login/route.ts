import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSession, setAdminCookie } from "@/lib/admin-auth";

const temporaryAdminEmail = "rtlon@gmail.com";
const temporaryAdminPassword = "14161416hH";

async function passwordMatches(password: string, configuredPassword: string) {
  const normalizedPassword = password.trim();
  const normalizedConfiguredPassword = configuredPassword.trim();

  if (
    normalizedConfiguredPassword.startsWith("$2a$") ||
    normalizedConfiguredPassword.startsWith("$2b$") ||
    normalizedConfiguredPassword.startsWith("$2y$")
  ) {
    return bcrypt.compare(normalizedPassword, normalizedConfiguredPassword);
  }

  return normalizedPassword === normalizedConfiguredPassword;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  const envValid = Boolean(
    adminEmail &&
      adminPasswordHash &&
      email === adminEmail &&
      (await passwordMatches(password, adminPasswordHash))
  );
  const temporaryValid = email === temporaryAdminEmail && password.trim() === temporaryAdminPassword;

  if (!envValid && !temporaryValid && (!adminEmail || !adminPasswordHash)) {
    return NextResponse.json({ error: "بيانات الأدمن غير مضبوطة في ENV" }, { status: 500 });
  }

  if (!envValid && !temporaryValid) return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });

  setAdminCookie(createAdminSession(email));
  return NextResponse.json({ ok: true });
}
