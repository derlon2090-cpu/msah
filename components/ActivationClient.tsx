"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ActivationClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function activate() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "تعذر تفعيل الكود");
      return;
    }

    setMessage(`${payload.code.remaining_uses} من ${payload.code.total_uses} استخدام`);
    router.push("/editor");
  }

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-950">تفعيل المحرر</h1>
          <p className="mt-1 text-sm text-slate-500">أدخل كود التفعيل لفتح أدوات إزالة العناصر.</p>
        </div>
      </div>
      <div className="mt-6 flex gap-3 max-sm:flex-col">
        <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="أدخل كود التفعيل" />
        <Button onClick={activate} disabled={loading}>
          <ShieldCheck className="h-4 w-4" />
          {loading ? "جاري التفعيل" : "تفعيل"}
        </Button>
      </div>
      {message ? <p className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{message}</p> : null}
    </div>
  );
}
