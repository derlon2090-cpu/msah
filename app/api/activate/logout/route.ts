import { NextResponse } from "next/server";
import { revokeCurrentCodeSession } from "@/lib/code-auth";

export async function POST() {
  await revokeCurrentCodeSession();
  return NextResponse.json({ ok: true });
}
