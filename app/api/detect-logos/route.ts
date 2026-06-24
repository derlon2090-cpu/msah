import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    boxes: [
      {
        id: "logo-1",
        label: "شعار مقترح",
        confidence: 0.96,
        x: 42,
        y: 29,
        width: 20,
        height: 31,
        accepted: true
      }
    ]
  });
}
