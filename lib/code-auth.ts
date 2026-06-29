import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/ensure-db";

export const codeSessionCookie = "activation_session";

function secureCookie() {
  return process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isActivationCodeUsable(code: {
  isActive: boolean;
  expiresAt: Date | null;
  remainingUses: number;
}) {
  return code.isActive && (!code.expiresAt || code.expiresAt.getTime() > Date.now()) && code.remainingUses > 0;
}

export async function createCodeSession(activationCodeId: string) {
  await ensureDatabase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await prisma.codeSession.create({
    data: {
      activationCodeId,
      sessionTokenHash: hashSessionToken(token),
      expiresAt
    }
  });

  cookies().set(codeSessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    expires: expiresAt
  });

  return { token, expiresAt };
}

export async function getCurrentCodeSession() {
  await ensureDatabase();
  const token = cookies().get(codeSessionCookie)?.value;
  if (!token) return null;

  const session = await prisma.codeSession.findUnique({
    where: { sessionTokenHash: hashSessionToken(token) },
    include: { activationCode: true }
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
  if (!isActivationCodeUsable(session.activationCode)) return null;

  return session;
}

export async function revokeCurrentCodeSession() {
  await ensureDatabase();
  const token = cookies().get(codeSessionCookie)?.value;
  if (token) {
    await prisma.codeSession.updateMany({
      where: { sessionTokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  cookies().set(codeSessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: 0
  });
}
