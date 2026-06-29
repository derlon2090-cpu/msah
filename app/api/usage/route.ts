import { NextResponse } from "next/server";
import { getCurrentCodeSession } from "@/lib/code-auth";

export async function GET() {
  const session = await getCurrentCodeSession();
  const code = session?.activationCode;
  if (!code) return NextResponse.json({ error: "لا يوجد كود مفعل" }, { status: 404 });

  return NextResponse.json({
    id: code.id,
    total_uses: code.totalUses,
    remaining_uses: code.remainingUses
  });
}
