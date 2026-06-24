"use client";

import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcessedImage } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ImagesClient() {
  const [images, setImages] = useState<ProcessedImage[]>([]);

  async function load() {
    const response = await fetch("/api/images");
    const payload = await response.json();
    setImages(payload.images ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    await fetch("/api/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    load();
  }

  return (
    <section className="app-container py-10">
      <h1 className="text-4xl font-black text-slate-950">الصور</h1>
      <p className="mt-3 text-slate-500">كل صورة تمت معالجتها عبر كود التفعيل الحالي.</p>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {images.map((image) => (
          <article key={image.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="overflow-hidden rounded-md bg-slate-50">
                <p className="px-3 py-2 text-xs font-black text-slate-500">قبل</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.original_url} alt="قبل" className="aspect-video w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-md bg-slate-50">
                <p className="px-3 py-2 text-xs font-black text-slate-500">بعد</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.result_url} alt="بعد" className="aspect-video w-full object-cover" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-500">تاريخ المعالجة: {formatDate(image.created_at)}</p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={image.result_url} download>
                    <Download className="h-4 w-4" />
                    تحميل
                  </a>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(image.id)}>
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          </article>
        ))}
        {!images.length ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
            لا توجد صور محفوظة بعد.
          </div>
        ) : null}
      </div>
    </section>
  );
}
