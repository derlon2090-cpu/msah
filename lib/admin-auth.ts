import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const cookieName = "admin_session";

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET غير مضبوط في متغيرات البيئة");
  return secret;
}

function useSecureCookie() {
  return process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";
}

export function readCookieFromHeader(request: Request | undefined, name: string) {
  const header = request?.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createAdminSession(email: string) {
  const issuedAt = Date.now();
  const payload = Buffer.from(JSON.stringify({ email, issuedAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSession(value?: string) {
  if (!value || !value.includes(".")) return false;
  const [payload, signature] = value.split(".");
  const expected = sign(payload);
  const safeA = Buffer.from(signature);
  const safeB = Buffer.from(expected);
  if (safeA.length !== safeB.length || !timingSafeEqual(safeA, safeB)) return false;

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { issuedAt?: number };
  const issuedAt = Number(decoded.issuedAt);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt < 1000 * 60 * 60 * 12;
}

export function isAdminRequest(request?: Request) {
  return verifyAdminSession(readCookieFromHeader(request, cookieName) ?? cookies().get(cookieName)?.value);
}

export function setAdminCookie(session: string) {
  cookies().set(cookieName, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie(),
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export function clearAdminCookie() {
  cookies().set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie(),
    path: "/",
    maxAge: 0
  });
}
