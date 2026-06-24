import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readCookieFromHeader } from "@/lib/admin-auth";
import { getCodeByValue } from "@/lib/store";

export async function GET(request: Request) {
  const codeValue = readCookieFromHeader(request, "activation_code") ?? cookies().get("activation_code")?.value;
  const code = codeValue ? await getCodeByValue(codeValue) : null;
  if (!code) return NextResponse.json({ error: "لا يوجد كود مفعل" }, { status: 404 });
  return NextResponse.json({
    id: code.id,
    total_uses: code.total_uses,
    remaining_uses: code.remaining_uses
  });
}
