"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Copy,
  Eye,
  ImageIcon,
  KeyRound,
  LogOut,
  Pencil,
  Power,
  Sparkles,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivationCode, PricingPlan, ProcessedImage } from "@/lib/types";
import { formatDate, generateActivationCode } from "@/lib/utils";
import { Logo } from "@/components/Logo";

type Stats = {
  totalCodes: number;
  activeCodes: number;
  expiredCodes: number;
  totalImages: number;
  remainingUses: number;
};

const emptyStats: Stats = {
  totalCodes: 0,
  activeCodes: 0,
  expiredCodes: 0,
  totalImages: 0,
  remainingUses: 0
};

export function AdminDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [maxImageMb, setMaxImageMb] = useState(25);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    code: generateActivationCode(),
    total_uses: 20,
    remaining_uses: 20,
    expires_at: "",
    is_active: true,
    notes: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImagesFor, setShowImagesFor] = useState<string | null>(null);

  const imagesForCode = useMemo(
    () => images.filter((image) => image.activation_code_id === showImagesFor),
    [images, showImagesFor]
  );

  useEffect(() => {
    loadAdmin();
    fetch("/api/admin/pricing")
      .then((response) => response.json())
      .then((payload) => {
        setPlans(payload.plans ?? []);
        setMaxImageMb(payload.settings?.max_image_mb ?? 25);
      });
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  async function loadAdmin() {
    setLoading(true);
    const response = await fetch("/api/admin/codes");
    if (response.status === 401) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setCodes(payload.codes ?? []);
    setImages(payload.images ?? []);
    setStats(payload.stats ?? emptyStats);
    setMaxImageMb(payload.settings?.max_image_mb ?? 25);
    setLoggedIn(true);
    setLoading(false);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = await response.json();
    if (!response.ok) {
      notify(payload.error ?? "فشل تسجيل الدخول");
      return;
    }
    notify("تم تسجيل الدخول");
    loadAdmin();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    notify("تم تسجيل الخروج");
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/admin/codes/${editingId}` : "/api/admin/codes", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    if (!response.ok) {
      notify(payload.error ?? "تعذر حفظ الكود");
      return;
    }
    notify(editingId ? "تم تعديل كود التفعيل" : "تم إنشاء كود التفعيل");
    setEditingId(null);
    setForm({
      customer_name: "",
      code: generateActivationCode(),
      total_uses: 20,
      remaining_uses: 20,
      expires_at: "",
      is_active: true,
      notes: ""
    });
    loadAdmin();
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    notify("تم نسخ الكود");
  }

  async function patchCode(id: string, patch: Partial<ActivationCode>, message: string) {
    const response = await fetch(`/api/admin/codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) {
      notify("تعذر تعديل الكود");
      return;
    }
    notify(message);
    loadAdmin();
  }

  async function deleteCode(id: string) {
    const response = await fetch(`/api/admin/codes/${id}`, { method: "DELETE" });
    if (!response.ok) {
      notify("تعذر حذف الكود");
      return;
    }
    notify("تم حذف الكود");
    loadAdmin();
  }

  function startEdit(item: ActivationCode) {
    setEditingId(item.id);
    setForm({
      customer_name: item.customer_name ?? "",
      code: item.code,
      total_uses: item.total_uses,
      remaining_uses: item.remaining_uses,
      expires_at: item.expires_at ? item.expires_at.slice(0, 10) : "",
      is_active: item.is_active,
      notes: item.notes ?? ""
    });
    notify("يمكنك تعديل بيانات الكود من النموذج");
  }

  async function savePricing() {
    await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans, settings: { max_image_mb: maxImageMb } })
    });
    notify("تم تعديل الأسعار والباقات");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm font-bold text-slate-500">جاري التحميل</div>;
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-white">
        {toast ? <Toast message={toast} /> : null}
        <div className="app-container flex min-h-screen items-center justify-center py-12">
          <form onSubmit={login} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
            <Logo />
            <h1 className="mt-8 text-2xl font-black text-slate-950">دخول الأدمن</h1>
            <p className="mt-2 text-sm text-slate-500">هذه شاشة خاصة لإدارة الأكواد والصور والباقات.</p>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                البريد
              <Input className="mt-2" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@demo.com" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                كلمة المرور
                <Input className="mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور من ENV" />
              </label>
            </div>
            <Button className="mt-6 w-full" type="submit">
              <KeyRound className="h-4 w-4" />
              تسجيل الدخول
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {toast ? <Toast message={toast} /> : null}
      <header className="border-b border-slate-200 bg-white">
        <div className="app-container flex h-20 items-center justify-between">
          <Logo />
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            تسجيل خروج
          </Button>
        </div>
      </header>
      <section className="app-container py-8">
        <div className="grid gap-4 md:grid-cols-5">
          <Stat label="عدد الأكواد الكلي" value={stats.totalCodes} />
          <Stat label="الأكواد النشطة" value={stats.activeCodes} />
          <Stat label="الأكواد المنتهية" value={stats.expiredCodes} />
          <Stat label="إجمالي الصور المعالجة" value={stats.totalImages} />
          <Stat label="إجمالي الاستخدامات المتبقية" value={stats.remainingUses} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <form onSubmit={submitCode} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-slate-950">{editingId ? "تعديل كود تفعيل" : "إنشاء كود تفعيل"}</h2>
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      customer_name: "",
                      code: generateActivationCode(),
                      total_uses: 20,
                      remaining_uses: 20,
                      expires_at: "",
                      is_active: true,
                      notes: ""
                    });
                  }}
                >
                  إلغاء
                </Button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              <Field label="اسم العميل اختياري">
                <Input value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} />
              </Field>
              <Field label="كود التفعيل">
                <div className="flex gap-2">
                  <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
                  <Button type="button" variant="soft" onClick={() => setForm({ ...form, code: generateActivationCode() })}>
                    <Sparkles className="h-4 w-4" />
                    توليد
                  </Button>
                </div>
              </Field>
              <Field label="عدد مرات الاستخدام">
                <Input
                  type="number"
                  min={1}
                  value={form.total_uses}
                  onChange={(event) => {
                    const total = Number(event.target.value);
                    setForm({ ...form, total_uses: total, remaining_uses: editingId ? form.remaining_uses : total });
                  }}
                />
              </Field>
              {editingId ? (
                <Field label="مرات الاستخدام المتبقية">
                  <Input
                    type="number"
                    min={0}
                    value={form.remaining_uses}
                    onChange={(event) => setForm({ ...form, remaining_uses: Number(event.target.value) })}
                  />
                </Field>
              ) : null}
              <Field label="تاريخ انتهاء الكود">
                <Input type="date" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} />
              </Field>
              <label className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                حالة الكود: {form.is_active ? "نشط" : "غير نشط"}
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              </label>
              <Field label="ملاحظات داخلية">
                <Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </Field>
            </div>
            <Button className="mt-5 w-full" type="submit">
              {editingId ? "حفظ التعديل" : "إنشاء الكود"}
            </Button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">جدول الأكواد</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[960px] text-right text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="px-3 py-3">الكود</th>
                    <th className="px-3 py-3">اسم العميل</th>
                    <th className="px-3 py-3">الاستخدامات الكلية</th>
                    <th className="px-3 py-3">الاستخدامات المتبقية</th>
                    <th className="px-3 py-3">تاريخ الانتهاء</th>
                    <th className="px-3 py-3">الحالة</th>
                    <th className="px-3 py-3">تاريخ الإنشاء</th>
                    <th className="px-3 py-3">أزرار</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-black text-slate-950">{item.code}</td>
                      <td className="px-3 py-3">{item.customer_name || "-"}</td>
                      <td className="px-3 py-3">{item.total_uses}</td>
                      <td className="px-3 py-3">{item.remaining_uses}</td>
                      <td className="px-3 py-3">{formatDate(item.expires_at)}</td>
                      <td className="px-3 py-3">
                        <span className={item.is_active ? "text-emerald-600" : "text-slate-400"}>
                          {item.is_active ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="px-3 py-3">{formatDate(item.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <IconButton label="نسخ الكود" onClick={() => copyCode(item.code)} icon={<Copy className="h-4 w-4" />} />
                          <IconButton
                            label="تعديل"
                            onClick={() => startEdit(item)}
                            icon={<Pencil className="h-4 w-4" />}
                          />
                          <IconButton
                            label="تعطيل"
                            onClick={() => patchCode(item.id, { is_active: !item.is_active }, item.is_active ? "تم تعطيل الكود" : "تم تفعيل الكود")}
                            icon={<Power className="h-4 w-4" />}
                          />
                          <IconButton label="حذف" onClick={() => deleteCode(item.id)} icon={<Trash2 className="h-4 w-4" />} destructive />
                          <IconButton label="عرض الصور المرتبطة" onClick={() => setShowImagesFor(showImagesFor === item.id ? null : item.id)} icon={<Eye className="h-4 w-4" />} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showImagesFor ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <ImageIcon className="h-5 w-5 text-blue-700" />
              الصور المرتبطة
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {imagesForCode.map((image) => (
                <div key={image.id} className="rounded-md border border-slate-200 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.result_url} alt="صورة معالجة" className="aspect-video w-full rounded-md object-cover" />
                  <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(image.created_at)}</p>
                </div>
              ))}
              {!imagesForCode.length ? <p className="text-sm font-bold text-slate-500">لا توجد صور مرتبطة بهذا الكود.</p> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">تعديل الأسعار والباقات</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan, index) => (
              <div key={plan.id} className="rounded-md border border-slate-200 p-4">
                <Field label="اسم الباقة">
                  <Input value={plan.name} onChange={(event) => setPlans((items) => items.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))} />
                </Field>
                <Field label="الاستخدامات">
                  <Input value={plan.uses} onChange={(event) => setPlans((items) => items.map((item, i) => (i === index ? { ...item, uses: event.target.value } : item)))} />
                </Field>
                <Field label="السعر">
                  <Input value={plan.price} onChange={(event) => setPlans((items) => items.map((item, i) => (i === index ? { ...item, price: event.target.value } : item)))} />
                </Field>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={savePricing}>حفظ الأسعار</Button>
            <label className="flex items-center gap-3 text-sm font-bold text-slate-600">
              الحد الأقصى لحجم الصورة
              <Input className="w-28" type="number" min={1} value={maxImageMb} onChange={(event) => setMaxImageMb(Number(event.target.value))} />
              ميجابايت
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  destructive
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${
        destructive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 rounded-md border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-soft">
      {message}
    </div>
  );
}
