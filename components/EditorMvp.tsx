"use client";

import { ChangeEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Brush,
  Download,
  Eraser,
  Hand,
  ImageIcon,
  Lock,
  LockOpen,
  Maximize,
  Minimize,
  Redo2,
  RefreshCcw,
  ScanSearch,
  Sparkles,
  SquareDashedMousePointer,
  Undo2,
  Upload,
  WandSparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetectionBox } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tool = "move" | "rect" | "brush" | "erase";
type Status = "idle" | "uploading" | "analyzing" | "removing" | "done" | "failed";

type Usage = {
  id: string;
  total_uses: number;
  remaining_uses: number;
};

export function EditorMvp({ previewLocked = false }: { previewLocked?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [tool, setTool] = useState<Tool>("rect");
  const [zoom, setZoom] = useState(1);
  const [imageUrl, setImageUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [showAfter, setShowAfter] = useState(false);
  const [selection, setSelection] = useState({ x: 42, y: 29, w: 20, h: 31 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [toast, setToast] = useState("");

  const locked = !unlocked;
  const statusText = {
    idle: "جاهز",
    uploading: "جاري رفع الصورة",
    analyzing: "جاري تحليل الصورة",
    removing: "جاري إزالة العنصر",
    done: "تم الانتهاء",
    failed: "فشل، حاول مرة أخرى"
  } satisfies Record<Status, string>;

  const sampleImage = useMemo(
    () =>
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 492">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#efe1cd"/>
            <stop offset="1" stop-color="#f9f1e8"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#8b7359" flood-opacity=".18"/>
          </filter>
        </defs>
        <rect width="920" height="492" fill="url(#bg)"/>
        <circle cx="190" cy="330" r="52" fill="#a58d70"/>
        <path d="M740 350c38-82 112-99 136-27 18 54-28 105-96 91-47-10-62-35-40-64z" fill="#9d8568"/>
        <rect x="430" y="86" width="145" height="305" rx="35" fill="#d8b992" filter="url(#shadow)"/>
        <rect x="430" y="86" width="145" height="68" rx="34" fill="#e2c8a9"/>
        <circle cx="503" cy="238" r="34" fill="none" stroke="#171923" stroke-width="4"/>
        <path d="M473 259l24-46 16 30 14-18 28 34z" fill="none" stroke="#171923" stroke-width="4"/>
        <text x="503" y="296" text-anchor="middle" font-family="Arial" font-size="33" font-weight="700" fill="#171923" letter-spacing="5">NATURA</text>
        <text x="503" y="325" text-anchor="middle" font-family="Arial" font-size="15" fill="#171923" letter-spacing="3">COLLECTION</text>
        <path d="M0 160c94-54 153-32 252-62 102-31 159-87 270-67 81 14 121 64 224 52 75-8 114-49 174-55v-28H0z" fill="#fff" opacity=".28"/>
      </svg>`),
    []
  );

  useEffect(() => {
    refreshUsage();
    loadImage(sampleImage);
  }, [sampleImage]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function activate(input = code, silent = false) {
    const response = await fetch("/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: input })
    });
    const payload = await response.json();
    if (!response.ok) {
      if (!silent) notify(payload.error ?? "الكود غير صالح");
      return;
    }
    setUnlocked(true);
    setUsage(payload.code);
    setCode("");
    if (!silent) notify("تم فتح المحرر وإضافة مرات الاستخدام");
  }

  async function refreshUsage() {
    const response = await fetch("/api/usage");
    if (!response.ok) return;
    const payload = await response.json();
    setUnlocked(true);
    setUsage(payload);
  }

  async function logoutCode() {
    await fetch("/api/activate/logout", { method: "POST" });
    setUnlocked(false);
    setUsage(null);
    setCode("");
    notify("تم تسجيل الخروج من الكود");
    window.location.href = "/activate";
  }

  function getCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return null;
    return { canvas, ctx };
  }

  function loadImage(src: string) {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const target = getCanvas();
      if (!target) return;
      const maxWidth = 920;
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      target.canvas.width = Math.round(img.naturalWidth * scale);
      target.canvas.height = Math.round(img.naturalHeight * scale);
      target.ctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
      target.ctx.drawImage(img, 0, 0, target.canvas.width, target.canvas.height);
      setHistory([target.canvas.toDataURL("image/png")]);
      setFuture([]);
      setResultUrl("");
      setShowAfter(false);
    };
    img.src = src;
    setImageUrl(src);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      loadImage(dataUrl);
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl })
      });
      const payload = await response.json();
      if (!response.ok) notify(payload.error ?? "تعذر التحقق من الصورة");
      setUploadedUrl("");
      setStatus("idle");
      notify("تم رفع الصورة");
    };
    reader.readAsDataURL(file);
  }

  function pushHistory() {
    const current = getCanvas()?.canvas.toDataURL("image/png");
    if (!current) return;
    setHistory((items) => [...items, current].slice(-20));
    setFuture([]);
  }

  function undo() {
    if (history.length < 2) return;
    const previous = history[history.length - 2];
    setFuture((items) => [history[history.length - 1], ...items]);
    setHistory((items) => items.slice(0, -1));
    loadImage(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    loadImage(next);
  }

  function pointerToPercent(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  function onCanvasDown(event: MouseEvent<HTMLCanvasElement>) {
    if (locked || !unlocked) return;
    setIsDrawing(true);
    if (tool === "rect") {
      const point = pointerToPercent(event);
      setSelection({ x: point.x, y: point.y, w: 1, h: 1 });
    } else if (tool === "brush" || tool === "erase") {
      paint(event, tool === "erase");
    }
  }

  function onCanvasMove(event: MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || locked || !unlocked) return;
    if (tool === "rect") {
      const point = pointerToPercent(event);
      setSelection((start) => ({
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        w: Math.abs(point.x - start.x),
        h: Math.abs(point.y - start.y)
      }));
    } else if (tool === "brush" || tool === "erase") {
      paint(event, tool === "erase");
    }
  }

  function onCanvasUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (tool === "brush" || tool === "erase") pushHistory();
  }

  function paint(event: MouseEvent<HTMLCanvasElement>, erase: boolean) {
    const target = getCanvas();
    if (!target) return;
    const rect = target.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * target.canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * target.canvas.height;
    target.ctx.save();
    target.ctx.globalAlpha = erase ? 0.7 : 0.32;
    target.ctx.fillStyle = erase ? "#ffffff" : "#2563eb";
    target.ctx.beginPath();
    target.ctx.arc(x, y, erase ? 22 : 28, 0, Math.PI * 2);
    target.ctx.fill();
    target.ctx.restore();
  }

  async function detectLogos() {
    if (locked || !unlocked) return;
    setStatus("analyzing");
    const response = await fetch("/api/detect-logos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: uploadedUrl || imageUrl })
    });
    const payload = await response.json();
    setDetections(payload.boxes ?? []);
    if (payload.boxes?.[0]) {
      const first = payload.boxes[0];
      setSelection({ x: first.x, y: first.y, w: first.width, h: first.height });
    }
    setStatus("idle");
    notify("تم التعرف على الشعار تلقائيا");
  }

  function acceptDetection(id: string, accepted: boolean) {
    setDetections((items) => items.map((item) => (item.id === id ? { ...item, accepted } : item)));
    const selected = detections.find((item) => item.id === id);
    if (selected && accepted) setSelection({ x: selected.x, y: selected.y, w: selected.width, h: selected.height });
  }

  function makeResult() {
    const target = getCanvas();
    const img = imageRef.current;
    if (!target || !img) return "";

    target.canvas.width = img.naturalWidth;
    target.canvas.height = img.naturalHeight;
    target.ctx.drawImage(img, 0, 0, target.canvas.width, target.canvas.height);

    const sx = Math.max(0, Math.round((selection.x / 100) * target.canvas.width));
    const sy = Math.max(0, Math.round((selection.y / 100) * target.canvas.height));
    const sw = Math.max(12, Math.round((selection.w / 100) * target.canvas.width));
    const sh = Math.max(12, Math.round((selection.h / 100) * target.canvas.height));
    const feather = Math.max(12, Math.round(Math.min(sw, sh) * 0.12));

    const sample = target.ctx.getImageData(Math.max(0, sx - 8), sy, 1, Math.min(sh, target.canvas.height - sy)).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < sample.length; i += 4) {
      r += sample[i];
      g += sample[i + 1];
      b += sample[i + 2];
      count += 1;
    }
    const fill = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;

    target.ctx.save();
    target.ctx.filter = `blur(${Math.round(feather / 2)}px)`;
    target.ctx.drawImage(target.canvas, Math.max(0, sx - feather), Math.max(0, sy - feather), sw + feather * 2, sh + feather * 2, sx, sy, sw, sh);
    target.ctx.filter = "none";
    const gradient = target.ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(0.5, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, fill);
    target.ctx.globalAlpha = 0.82;
    target.ctx.fillStyle = gradient;
    target.ctx.fillRect(sx, sy, sw, sh);
    target.ctx.globalAlpha = 1;
    target.ctx.restore();

    const sourceType = imageUrl.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png";
    const output = target.canvas.toDataURL(sourceType, sourceType === "image/jpeg" ? 0.96 : undefined);
    setResultUrl(output);
    setShowAfter(true);
    return output;
  }

  async function removeObject() {
    if (!unlocked || locked) {
      notify("أدخل كود التفعيل أولا");
      return;
    }
    setStatus("removing");
    try {
      const output = makeResult();
      const response = await fetch("/api/remove-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          originalDataUrl: imageUrl,
          resultDataUrl: output
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر حفظ الصورة");
      setUsage(payload.usage);
      setStatus("done");
      notify("تمت إزالة العنصر مع حفظ الصورة");
    } catch {
      setStatus("failed");
      notify("فشل، حاول مرة أخرى");
    }
  }

  function downloadResult() {
    const link = document.createElement("a");
    link.href = resultUrl || imageUrl;
    link.download = "ai-eraser-result.png";
    link.click();
  }

  const usageLabel = usage ? `${usage.remaining_uses} من ${usage.total_uses} استخدام` : "18 من 20 استخدام";

  return (
    <div className="relative">
      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-md border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-soft">
          {toast}
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
        <section className="glass-panel overflow-hidden rounded-lg">
          <div className="flex min-h-[84px] flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={locked} className="h-12">
              <Upload className="h-5 w-5" />
              رفع صورة جديدة
            </Button>
            <div className={cn("flex h-12 items-center gap-3 border-r border-slate-200 pr-4", unlocked && "text-emerald-700")}>
              {unlocked ? <LockOpen className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
              <span className="text-xs font-bold">{unlocked ? "مفتوح" : "مقفل"}</span>
            </div>
            <div className="flex min-w-48 items-center gap-3 border-r border-slate-200 pr-4">
              <div className="text-xs font-bold text-slate-500">مرات الاستخدام المتبقية</div>
              <div className="text-xl font-black text-slate-800">{usageLabel}</div>
            </div>
            <button className="tool-button active" type="button">
              <ImageIcon className="h-6 w-6" />
              الصور
            </button>
            <button className={cn("tool-button", tool === "move" && "active")} onClick={() => setTool("move")} type="button">
              <Hand className="h-6 w-6" />
              تحريك
            </button>
            <button className={cn("tool-button", tool === "rect" && "active")} onClick={() => setTool("rect")} type="button">
              <SquareDashedMousePointer className="h-6 w-6" />
              تحديد
            </button>
            <button className={cn("tool-button", tool === "brush" && "active")} onClick={() => setTool("brush")} type="button">
              <Brush className="h-6 w-6" />
              فرشاة
            </button>
            <button className={cn("tool-button", tool === "erase" && "active")} onClick={() => setTool("erase")} type="button">
              <Eraser className="h-6 w-6" />
              ممحاة
            </button>
            <button className="tool-button" onClick={() => setZoom((value) => Math.min(1.6, value + 0.1))} type="button">
              <Maximize className="h-6 w-6" />
              تكبير
            </button>
            <button className="tool-button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))} type="button">
              <Minimize className="h-6 w-6" />
              تصغير
            </button>
            <button className="tool-button" onClick={undo} type="button">
              <Undo2 className="h-6 w-6" />
              تراجع
            </button>
            <button className="tool-button" onClick={redo} type="button">
              <Redo2 className="h-6 w-6" />
              إعادة
            </button>
            <button className="mr-auto rounded-md border border-violet-200 px-4 py-2 text-xs font-black text-violet-700" type="button">
              HD Quality
              <span className="block text-[10px] font-bold">حفظ بأعلى جودة</span>
            </button>
            {unlocked ? (
              <Button variant="outline" onClick={logoutCode} className="h-12">
                تسجيل خروج من الكود
              </Button>
            ) : null}
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-2">
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <span className="absolute right-4 top-4 z-10 rounded-md bg-slate-900/60 px-3 py-2 text-sm font-bold text-white">الصورة الأصلية</span>
              <div className="relative mx-auto aspect-[920/492] w-full overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="h-full w-full cursor-crosshair object-contain"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                  onMouseDown={onCanvasDown}
                  onMouseMove={onCanvasMove}
                  onMouseUp={onCanvasUp}
                  onMouseLeave={onCanvasUp}
                />
                <div
                  className="pointer-events-none absolute border-2 border-dashed border-blue-600"
                  style={{
                    right: `${100 - selection.x - selection.w}%`,
                    top: `${selection.y}%`,
                    width: `${selection.w}%`,
                    height: `${selection.h}%`
                  }}
                >
                  <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-blue-600 bg-white" />
                  <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-blue-600 bg-white" />
                  <span className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-blue-600 bg-white" />
                  <span className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-blue-600 bg-white" />
                </div>
                {locked ? (
                  <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
                    <div className="flex flex-wrap items-center gap-3">
                      <Lock className="h-5 w-5 text-blue-700" />
                      <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="أدخل كود التفعيل" className="max-w-52" />
                      <Button size="sm" onClick={() => activate()}>
                        تفعيل
                      </Button>
                      <span className="text-sm font-bold text-slate-500">الدخول عبر كود التفعيل فقط</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <span className="absolute right-4 top-4 z-10 rounded-md bg-slate-900/60 px-3 py-2 text-sm font-bold text-white">بعد الإزالة</span>
              <div className="aspect-[920/492] w-full">
                {showAfter && resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultUrl} alt="بعد الإزالة" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm font-bold text-slate-400">
                    تظهر المقارنة بعد إزالة العنصر
                  </div>
                )}
              </div>
              {showAfter ? (
                <div className="absolute bottom-5 left-5 rounded-lg bg-white px-5 py-4 shadow-soft">
                  <div className="flex items-center gap-3 text-emerald-700">
                    <BadgeCheck className="h-8 w-8" />
                    <div>
                      <p className="font-black">تمت إزالة العنصر</p>
                      <p className="text-xs text-slate-500">تم الحفاظ على الجودة</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3 rounded-md border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700">
              <BadgeCheck className="h-5 w-5" />
              {unlocked ? "تم تفعيل الأداة بنجاح" : "المحرر مقفل حتى إدخال كود صحيح"}
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              يتم حفظ الصور لمدة 10 أيام فقط ثم تُحذف تلقائيًا.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="soft" onClick={detectLogos} disabled={locked || !unlocked}>
                <ScanSearch className="h-5 w-5" />
                تحديث الاكتشاف
              </Button>
              <Button onClick={removeObject} disabled={locked || !unlocked || status === "removing"}>
                <WandSparkles className="h-5 w-5" />
                إزالة العنصر
              </Button>
              <Button variant="outline" onClick={downloadResult}>
                <Download className="h-5 w-5" />
                تحميل الصورة
              </Button>
            </div>
          </div>
        </section>

        <aside className="glass-panel rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">اكتشاف ذكي</h2>
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <WandSparkles className="h-10 w-10" />
            </div>
          </div>
          <p className="mt-5 text-center text-sm font-black text-slate-800">تم التعرف على العناصر تلقائيا</p>
          <p className="mt-2 text-center text-sm text-slate-500">دقة اكتشاف 96%</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[96%] rounded-full bg-gradient-to-l from-blue-600 to-violet-500" />
          </div>
          <div className="mt-5 space-y-3">
            {(detections.length ? detections : [{ id: "sample", label: "شعار", confidence: 96, x: 42, y: 29, width: 20, height: 31, accepted: true }]).map((box, index) => (
              <button
                key={box.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-bold"
                onClick={() => acceptDetection(box.id, !box.accepted)}
              >
                <span>{index + 1} عنصر</span>
                <span className={box.accepted ? "text-emerald-600" : "text-slate-400"}>{box.accepted ? "تم تحديده" : "لم يتم تحديده"}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-md bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">حالة الكشف الذكي</p>
            <p className="mt-1 text-base font-black text-slate-900">{statusText[status]}</p>
          </div>
          <div className="mt-4 rounded-md bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">مرات الاستخدام المتبقية</p>
            <p className="mt-1 text-base font-black text-slate-900">{usageLabel}</p>
          </div>
          <div className="mt-4 rounded-md bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">الصور السابقة</p>
            <p className="mt-1 text-sm font-bold text-slate-700">تظهر في صفحة الصور بعد المعالجة.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
