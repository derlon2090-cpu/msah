"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PricingClient() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((response) => response.json())
      .then((payload) => setPlans(payload.plans ?? []));
  }, []);

  return (
    <section className="app-container py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-black text-slate-950">باقات الاستخدام</h1>
        <p className="mt-4 text-lg leading-8 text-slate-500">
          كل عملية شراء تولد كود تفعيل، ويمكن استخدام الكود مباشرة داخل المحرر.
        </p>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              "rounded-lg border border-slate-200 bg-white p-6 shadow-sm",
              plan.featured && "border-blue-300 shadow-soft"
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-950">{plan.name}</h2>
              {plan.featured ? <Sparkles className="h-5 w-5 text-violet-600" /> : null}
            </div>
            <p className="mt-4 text-3xl font-black text-blue-700">{plan.price}</p>
            <p className="mt-2 text-sm font-bold text-slate-500">{plan.uses}</p>
            <div className="mt-6 space-y-3 text-sm font-bold text-slate-700">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                كود تفعيل بعد الدفع
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                حفظ بأعلى جودة
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                مقارنة قبل/بعد
              </p>
            </div>
            <Button className="mt-7 w-full" variant={plan.featured ? "default" : "outline"}>
              شراء الباقة
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
