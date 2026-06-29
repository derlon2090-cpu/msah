"use client";

import {
  BadgeCheck,
  ChevronDown,
  Crown,
  Gem,
  Headphones,
  HelpCircle,
  LockKeyhole,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "باقة البداية",
    uses: "20 استخدام",
    price: "19",
    icon: Rocket,
    tone: "blue",
    featured: false
  },
  {
    name: "باقة مرنة",
    uses: "50 استخدام",
    price: "39",
    icon: SlidersHorizontal,
    tone: "blue",
    featured: false
  },
  {
    name: "الأكثر طلبًا",
    uses: "120 استخدام",
    price: "79",
    icon: Gem,
    tone: "violet",
    featured: true
  },
  {
    name: "باقة احترافية",
    uses: "300 استخدام",
    price: "149",
    icon: Crown,
    tone: "violet",
    featured: false
  }
];

const features = ["إزالة العناصر غير المرغوبة", "حفظ بجودة عالية", "دعم الصور المتعددة", "استخدام الكود مباشرة داخل المحرر"];

const assurances = [
  { title: "تفعيل فوري", text: "الكود يصلك مباشرة بعد الدفع", icon: Zap },
  { title: "دعم فني", text: "نحن هنا لمساعدتك دائمًا", icon: Headphones },
  { title: "جودة HD", text: "نتائج عالية الجودة", icon: BadgeCheck },
  { title: "دفعة آمنة", text: "معاملة مشفرة وآمنة 100%", icon: LockKeyhole }
];

const faqs = [
  ["كيف أستلم كود التفعيل؟", "بعد إتمام عملية الشراء يصلك كود التفعيل مباشرة إلى البريد الإلكتروني ويمكنك نسخه من صفحة التأكيد."],
  ["أين يمكنني استخدام الكود؟", "يمكنك استخدامه داخل صفحة المحرر لفتح أدوات المعالجة وحفظ الصور."],
  ["هل يوجد تاريخ انتهاء للكود؟", "الكود صالح للاستخدام في أي وقت ما لم يوجد تاريخ انتهاء محدد في تفاصيل الطلب."]
];

export function PricingClient() {
  return (
    <section className="relative overflow-hidden bg-white py-12">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,#eef2ff_1px,transparent_1px),linear-gradient(to_bottom,#eef2ff_1px,transparent_1px)] bg-[size:34px_34px] opacity-60" />
      <div className="pointer-events-none absolute left-10 top-10 text-violet-500">
        <Sparkles className="h-9 w-9 fill-violet-500/20" />
      </div>

      <div className="app-container relative">
        <div className="text-right">
          <h1 className="text-4xl font-black text-slate-950 md:text-5xl">باقات الاستخدام</h1>
          <p className="mt-4 text-sm font-bold text-slate-500">
            كل عملية شراء تولد كود تفعيل، ويمكن استخدام الكود مباشرة داخل المحرر.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
              <BadgeCheck className="h-4 w-4 text-violet-600" />
              دفعة مقابل ما تحتاجه فقط
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
              <Zap className="h-4 w-4 text-blue-600" />
              بدون اشتراك
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isViolet = plan.tone === "violet";
            return (
              <article
                key={plan.name}
                className={`relative rounded-lg border bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-soft ${
                  plan.featured ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"
                }`}
              >
                {plan.featured ? (
                  <div className="absolute right-5 top-0 -translate-y-1/2 rounded-md bg-violet-600 px-3 py-1 text-xs font-black text-white">
                    أفضل قيمة
                  </div>
                ) : null}
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isViolet ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-950">{plan.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">{plan.uses}</p>
                <div className="mx-auto mt-5 h-px w-4/5 bg-slate-100" />
                <p className={`mt-5 text-5xl font-black ${isViolet ? "text-violet-600" : "text-blue-600"}`}>
                  {plan.price}
                  <span className="mr-2 text-base font-bold">ريال</span>
                </p>
                <div className="mt-5 space-y-3 text-right text-sm font-bold text-slate-600">
                  {features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2">
                      <BadgeCheck className={`h-4 w-4 ${isViolet ? "text-violet-500" : "text-blue-500"}`} />
                      {feature}
                    </p>
                  ))}
                </div>
                <Button className={`mt-6 w-full ${isViolet ? "bg-violet-600 hover:bg-violet-700" : ""}`}>
                  شراء الآن
                </Button>
                <Button className="mt-3 w-full" variant="outline">
                  تفاصيل الباقة
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-4">
          {assurances.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`flex items-center justify-center gap-4 p-5 text-right ${index ? "border-t border-slate-100 md:border-r md:border-t-0" : ""}`}>
                <Icon className="h-7 w-7 text-blue-600" />
                <div>
                  <p className="text-sm font-black text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-end gap-2 text-sm font-black text-slate-700">
            أسئلة شائعة
            <HelpCircle className="h-4 w-4 text-violet-600" />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-md border border-slate-200 bg-white p-4 text-right">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-slate-900">
                  <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  {question}
                </summary>
                <p className="mt-3 text-xs font-bold leading-6 text-slate-500">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
