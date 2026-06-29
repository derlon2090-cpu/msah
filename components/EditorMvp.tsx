"use client";

import { ChangeEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Brush,
  Crop,
  Download,
  Eraser,
  Hand,
  ImageIcon,
  ImageOff,
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

type Tool = "move" | "rect" | "brush" | "erase" | "crop";
type Status = "idle" | "uploading" | "analyzing" | "removing" | "done" | "failed";

type Usage = {
  id: string;
  total_uses: number;
  remaining_uses: number;
};

type SelectionBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type RemovalOptions = {
  preciseWatermark?: boolean;
};

type ImageBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function EditorMvp({ previewLocked = false }: { previewLocked?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [tool, setTool] = useState<Tool>("rect");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [brushSize, setBrushSize] = useState(34);
  const [imageUrl, setImageUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [showAfter, setShowAfter] = useState(false);
  const [selection, setSelection] = useState({ x: 88, y: 86, w: 8, h: 8 });
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
    void loadImage(sampleImage);
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

  function getMaskCanvas() {
    const canvas = maskCanvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return null;
    return { canvas, ctx };
  }

  function syncMaskCanvas(width: number, height: number) {
    const mask = getMaskCanvas();
    if (!mask) return;
    mask.canvas.width = width;
    mask.canvas.height = height;
    mask.ctx.clearRect(0, 0, width, height);
  }

  function loadImage(src: string, options: { recordHistory?: boolean; clearFuture?: boolean } = {}) {
    const { recordHistory = true, clearFuture = true } = options;
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        const target = getCanvas();
        if (!target) {
          resolve();
          return;
        }
        const maxPreviewDimension = 2600;
        const scale = Math.min(1, maxPreviewDimension / Math.max(img.naturalWidth, img.naturalHeight));
        target.canvas.width = Math.round(img.naturalWidth * scale);
        target.canvas.height = Math.round(img.naturalHeight * scale);
        syncMaskCanvas(target.canvas.width, target.canvas.height);
        target.ctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
        target.ctx.drawImage(img, 0, 0, target.canvas.width, target.canvas.height);
        if (recordHistory) {
          setHistory((items) => (items[items.length - 1] === src ? items : [...items, src].slice(-20)));
          if (clearFuture) setFuture([]);
        }
        setResultUrl("");
        setShowAfter(false);
        setPan({ x: 0, y: 0 });
        resolve();
      };
      img.src = src;
      setImageUrl(src);
    });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      await loadImage(dataUrl);
      const detectedSelection = detectWatermarkSelection();
      setSelection(detectedSelection);
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
    reader.onloadend = () => {
      input.value = "";
    };
    reader.readAsDataURL(file);
  }

  function pushHistory() {
    const current = getCanvas()?.canvas.toDataURL("image/png");
    if (!current) return;
    setHistory((items) => [...items, current].slice(-20));
    setFuture([]);
  }

  function clearMask() {
    const mask = getMaskCanvas();
    if (!mask) return;
    mask.ctx.clearRect(0, 0, mask.canvas.width, mask.canvas.height);
  }

  function removeCurrentImage() {
    imageRef.current = null;
    const target = getCanvas();
    if (target) target.ctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
    clearMask();
    setImageUrl("");
    setResultUrl("");
    setUploadedUrl("");
    setShowAfter(false);
    setDetections([]);
    setHistory([]);
    setFuture([]);
    setPan({ x: 0, y: 0 });
    setSelection({ x: 88, y: 86, w: 8, h: 8 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    notify("تمت إزالة الصورة، اختر صورة أخرى");
    window.setTimeout(() => fileInputRef.current?.click(), 80);
  }

  function applyCrop() {
    const img = imageRef.current;
    if (!img) {
      notify("ارفع صورة أولا");
      return;
    }

    const sx = Math.max(0, Math.round((selection.x / 100) * img.naturalWidth));
    const sy = Math.max(0, Math.round((selection.y / 100) * img.naturalHeight));
    const sw = Math.max(8, Math.round((selection.w / 100) * img.naturalWidth));
    const sh = Math.max(8, Math.round((selection.h / 100) * img.naturalHeight));
    const width = Math.min(sw, img.naturalWidth - sx);
    const height = Math.min(sh, img.naturalHeight - sy);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || width <= 0 || height <= 0) return;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height);
    const sourceType = imageUrl.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png";
    const cropped = canvas.toDataURL(sourceType, sourceType === "image/jpeg" ? 0.96 : undefined);
    clearMask();
    loadImage(cropped);
    setTool("rect");
    notify("تم قص الصورة");
  }

  function undo() {
    if (history.length < 2) return;
    const previous = history[history.length - 2];
    setFuture((items) => [history[history.length - 1], ...items]);
    setHistory((items) => items.slice(0, -1));
    void loadImage(previous, { recordHistory: false });
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setHistory((items) => [...items, next].slice(-20));
    void loadImage(next, { recordHistory: false });
  }

  function getDisplayedImageBox() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sourceRatio = canvas.width && canvas.height ? canvas.width / canvas.height : rect.width / rect.height;
    const frameRatio = rect.width / rect.height;
    if (frameRatio > sourceRatio) {
      const width = rect.height * sourceRatio;
      return { left: rect.left + (rect.width - width) / 2, top: rect.top, width, height: rect.height };
    }
    const height = rect.width / sourceRatio;
    return { left: rect.left, top: rect.top + (rect.height - height) / 2, width: rect.width, height };
  }

  function getDisplayedImageBoxPercent() {
    const canvas = canvasRef.current;
    const box = getDisplayedImageBox();
    if (!canvas || !box) return { left: 0, top: 0, width: 100, height: 100 };
    const rect = canvas.getBoundingClientRect();
    return {
      left: ((box.left - rect.left) / rect.width) * 100,
      top: ((box.top - rect.top) / rect.height) * 100,
      width: (box.width / rect.width) * 100,
      height: (box.height / rect.height) * 100
    };
  }

  function pointerToPercent(event: MouseEvent<HTMLCanvasElement>) {
    const rect = getDisplayedImageBox() ?? canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    };
  }

  function onCanvasDown(event: MouseEvent<HTMLCanvasElement>) {
    if (locked || !unlocked) return;
    setIsDrawing(true);
    if (tool === "move") {
      setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y });
    } else if (tool === "rect" || tool === "crop") {
      const point = pointerToPercent(event);
      setSelection({ x: point.x, y: point.y, w: 1, h: 1 });
    } else if (tool === "brush" || tool === "erase") {
      paint(event, tool === "erase");
    }
  }

  function onCanvasMove(event: MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || locked || !unlocked) return;
    if (tool === "move" && dragStart) {
      setPan({
        x: dragStart.panX + event.clientX - dragStart.x,
        y: dragStart.panY + event.clientY - dragStart.y
      });
    } else if (tool === "rect" || tool === "crop") {
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
    setDragStart(null);
    if (tool === "brush" || tool === "erase") pushHistory();
  }

  function paint(event: MouseEvent<HTMLCanvasElement>, erase: boolean) {
    const target = getCanvas();
    const mask = getMaskCanvas();
    if (!target || !mask) return;
    const rect = getDisplayedImageBox() ?? target.canvas.getBoundingClientRect();
    const x = Math.min(mask.canvas.width, Math.max(0, ((event.clientX - rect.left) / rect.width) * mask.canvas.width));
    const y = Math.min(mask.canvas.height, Math.max(0, ((event.clientY - rect.top) / rect.height) * mask.canvas.height));
    mask.ctx.save();
    mask.ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    mask.ctx.fillStyle = "rgba(124, 58, 237, 0.62)";
    mask.ctx.beginPath();
    mask.ctx.arc(x, y, erase ? Math.max(6, brushSize * 0.72) : brushSize, 0, Math.PI * 2);
    mask.ctx.fill();
    mask.ctx.restore();
  }

  async function detectLogos() {
    if (locked || !unlocked) return;
    setStatus("analyzing");
    const boxes = detectWatermarkCandidates();
    setDetections(boxes);
    if (boxes[0]) setSelection({ x: boxes[0].x, y: boxes[0].y, w: boxes[0].width, h: boxes[0].height });
    setStatus("idle");
    notify(boxes.length ? "تم تحديد علامة مائية مقترحة" : "لم يظهر شعار واضح، حدد المنطقة بالفرشاة");
  }

  function detectWatermarkSelection() {
    const boxes = detectWatermarkCandidates();
    const box = boxes[0];
    if (box) return { x: box.x, y: box.y, w: box.width, h: box.height };
    return { x: 84, y: 82, w: 14, h: 14 };
  }

  function detectWatermarkCandidates(): DetectionBox[] {
    const target = getCanvas();
    if (!target) return [];
    const { canvas, ctx } = target;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const candidates = [
      { id: "bottom-right", label: "علامة مائية أسفل اليمين", x: 84, y: 82, width: 14, height: 14 },
      { id: "bottom-left", label: "علامة مائية أسفل اليسار", x: 2, y: 82, width: 14, height: 14 },
      { id: "top-right", label: "شعار أعلى اليمين", x: 84, y: 2, width: 14, height: 14 },
      { id: "top-left", label: "شعار أعلى اليسار", x: 2, y: 2, width: 14, height: 14 }
    ];

    const scored = candidates
      .map((box) => {
        const sx = Math.floor((box.x / 100) * canvas.width);
        const sy = Math.floor((box.y / 100) * canvas.height);
        const ex = Math.min(canvas.width, Math.floor(((box.x + box.width) / 100) * canvas.width));
        const ey = Math.min(canvas.height, Math.floor(((box.y + box.height) / 100) * canvas.height));
        let bright = 0;
        let contrast = 0;
        let count = 0;
        let minX = ex;
        let minY = ey;
        let maxX = sx;
        let maxY = sy;
        for (let y = sy + 1; y < ey - 1; y += 2) {
          for (let x = sx + 1; x < ex - 1; x += 2) {
            const i = (y * canvas.width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const l = (r + g + b) / 3;
            const saturation = Math.max(r, g, b) - Math.min(r, g, b);
            const j = (y * canvas.width + x + 1) * 4;
            const l2 = (data[j] + data[j + 1] + data[j + 2]) / 3;
            const edge = Math.abs(l - l2);
            if (l > 190) bright += 1;
            if ((l > 168 && saturation < 54) || l > 224) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
            contrast += edge;
            count += 1;
          }
        }
        const hasBounds = minX < maxX && minY < maxY;
        const padX = Math.round(canvas.width * 0.012);
        const padY = Math.round(canvas.height * 0.012);
        const refined = hasBounds
          ? {
              x: Math.max(0, ((minX - padX) / canvas.width) * 100),
              y: Math.max(0, ((minY - padY) / canvas.height) * 100),
              width: Math.min(100, ((maxX - minX + padX * 2) / canvas.width) * 100),
              height: Math.min(100, ((maxY - minY + padY * 2) / canvas.height) * 100)
            }
          : box;
        return { ...box, ...refined, score: count ? bright / count + contrast / count / 80 : 0 };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const fallback = best.score < 0.18 ? scored.find((item) => item.id === "bottom-right") ?? best : best;
    return [
      {
        id: fallback.id,
        label: fallback.label,
        confidence: Math.min(0.98, Math.max(0.72, fallback.score)),
        x: fallback.x,
        y: fallback.y,
        width: fallback.width,
        height: fallback.height,
        accepted: true
      }
    ];
  }

  function acceptDetection(id: string, accepted: boolean) {
    setDetections((items) => items.map((item) => (item.id === id ? { ...item, accepted } : item)));
    const selected = detections.find((item) => item.id === id);
    if (selected && accepted) setSelection({ x: selected.x, y: selected.y, w: selected.width, h: selected.height });
  }

  function makeResult(targetSelection: SelectionBox = selection, options: RemovalOptions = {}) {
    const target = getCanvas();
    const img = imageRef.current;
    if (!target || !img) return "";

    target.canvas.width = img.naturalWidth;
    target.canvas.height = img.naturalHeight;
    target.ctx.drawImage(img, 0, 0, target.canvas.width, target.canvas.height);

    const result = target.ctx.getImageData(0, 0, target.canvas.width, target.canvas.height);
    const mask = buildRemovalMask(target.canvas.width, target.canvas.height, targetSelection, options);
    if (options.preciseWatermark) {
      textureAwareWatermarkFill(result, mask, target.canvas.width, target.canvas.height);
    }
    inpaintImage(result, mask, target.canvas.width, target.canvas.height);
    harmonizeInpaint(result, mask, target.canvas.width, target.canvas.height);
    flattenMaskAlpha(result, mask, target.canvas.width, target.canvas.height);
    target.ctx.putImageData(result, 0, 0);

    const output = target.canvas.toDataURL("image/png");
    setResultUrl(output);
    setShowAfter(true);
    clearMask();
    return output;
  }

  function buildRemovalMask(width: number, height: number, targetSelection: SelectionBox = selection, options: RemovalOptions = {}) {
    const mask = new Uint8Array(width * height);
    const maskCanvas = getMaskCanvas();
    let hasBrushMask = false;
    if (maskCanvas && maskCanvas.canvas.width && maskCanvas.canvas.height) {
      const data = maskCanvas.ctx.getImageData(0, 0, maskCanvas.canvas.width, maskCanvas.canvas.height).data;
      for (let y = 0; y < height; y++) {
        const my = Math.min(maskCanvas.canvas.height - 1, Math.floor((y / height) * maskCanvas.canvas.height));
        for (let x = 0; x < width; x++) {
          const mx = Math.min(maskCanvas.canvas.width - 1, Math.floor((x / width) * maskCanvas.canvas.width));
          const alpha = data[(my * maskCanvas.canvas.width + mx) * 4 + 3];
          if (alpha > 20) {
            mask[y * width + x] = 1;
            hasBrushMask = true;
          }
        }
      }
    }

    if (!hasBrushMask && options.preciseWatermark) {
      hasBrushMask = buildPreciseWatermarkMask(mask, width, height, targetSelection);
    }

    if (!hasBrushMask) {
      const sx = Math.max(0, Math.round((targetSelection.x / 100) * width));
      const sy = Math.max(0, Math.round((targetSelection.y / 100) * height));
      const sw = Math.max(8, Math.round((targetSelection.w / 100) * width));
      const sh = Math.max(8, Math.round((targetSelection.h / 100) * height));
      const pad = Math.max(4, Math.round(Math.min(sw, sh) * 0.2));
      for (let y = Math.max(0, sy - pad); y < Math.min(height, sy + sh + pad); y++) {
        for (let x = Math.max(0, sx - pad); x < Math.min(width, sx + sw + pad); x++) {
          mask[y * width + x] = 1;
        }
      }
    }

    return dilateMask(mask, width, height, options.preciseWatermark ? 6 : 3);
  }

  function buildPreciseWatermarkMask(mask: Uint8Array, width: number, height: number, targetSelection: SelectionBox) {
    const target = getCanvas();
    if (!target) return false;
    const data = target.ctx.getImageData(0, 0, width, height).data;
    const sx = Math.max(0, Math.round((targetSelection.x / 100) * width));
    const sy = Math.max(0, Math.round((targetSelection.y / 100) * height));
    const ex = Math.min(width, Math.round(((targetSelection.x + targetSelection.w) / 100) * width));
    const ey = Math.min(height, Math.round(((targetSelection.y + targetSelection.h) / 100) * height));
    let hits = 0;

    for (let y = sy; y < ey; y++) {
      for (let x = sx; x < ex; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const l = (r + g + b) / 3;
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        if ((l > 170 && saturation < 56) || l > 226) {
          mask[y * width + x] = 1;
          hits += 1;
        }
      }
    }

    return hits > 12;
  }

  function dilateMask(mask: Uint8Array, width: number, height: number, radius: number) {
    const out = new Uint8Array(mask);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) out[ny * width + nx] = 1;
          }
        }
      }
    }
    return out;
  }

  function getMaskBounds(mask: Uint8Array, width: number, height: number): ImageBounds | null {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    return maxX >= minX && maxY >= minY ? { minX, minY, maxX, maxY } : null;
  }

  function textureAwareWatermarkFill(image: ImageData, mask: Uint8Array, width: number, height: number) {
    const bounds = getMaskBounds(mask, width, height);
    if (!bounds) return;
    const data = image.data;
    const original = new Uint8ClampedArray(data);
    const boxWidth = Math.max(8, bounds.maxX - bounds.minX + 1);
    const candidates = [
      { dx: -Math.max(6, Math.round(boxWidth * 1.15)), dy: 0 },
      { dx: -Math.max(6, Math.round(boxWidth * 0.75)), dy: -Math.max(4, Math.round(boxWidth * 0.25)) },
      { dx: 0, dy: -Math.max(6, Math.round(boxWidth * 0.75)) },
      { dx: -Math.max(6, Math.round(boxWidth * 0.75)), dy: Math.max(4, Math.round(boxWidth * 0.25)) }
    ];

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const p = y * width + x;
        if (!mask[p]) continue;
        let best = -1;
        let bestScore = Number.POSITIVE_INFINITY;
        for (const candidate of candidates) {
          const sx = Math.min(width - 1, Math.max(0, x + candidate.dx));
          const sy = Math.min(height - 1, Math.max(0, y + candidate.dy));
          const sp = sy * width + sx;
          if (mask[sp]) continue;
          const score = localPatchDifference(original, mask, width, height, x, y, sx, sy);
          if (score < bestScore) {
            bestScore = score;
            best = sp;
          }
        }
        if (best < 0) continue;
        const i = p * 4;
        const si = best * 4;
        data[i] = original[si];
        data[i + 1] = original[si + 1];
        data[i + 2] = original[si + 2];
        data[i + 3] = 255;
      }
    }
  }

  function localPatchDifference(data: Uint8ClampedArray, mask: Uint8Array, width: number, height: number, tx: number, ty: number, sx: number, sy: number) {
    let diff = 0;
    let count = 0;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const ax = tx + dx;
        const ay = ty + dy;
        const bx = sx + dx;
        const by = sy + dy;
        if (ax < 0 || ax >= width || ay < 0 || ay >= height || bx < 0 || bx >= width || by < 0 || by >= height) continue;
        const ap = ay * width + ax;
        const bp = by * width + bx;
        if (mask[ap] || mask[bp]) continue;
        const ai = ap * 4;
        const bi = bp * 4;
        diff += Math.abs(data[ai] - data[bi]) + Math.abs(data[ai + 1] - data[bi + 1]) + Math.abs(data[ai + 2] - data[bi + 2]);
        count += 1;
      }
    }
    return count ? diff / count : Number.POSITIVE_INFINITY;
  }

  function flattenMaskAlpha(image: ImageData, mask: Uint8Array, width: number, height: number) {
    const data = image.data;
    const refined = dilateMask(mask, width, height, 1);
    for (let i = 0; i < refined.length; i++) {
      if (!refined[i]) continue;
      data[i * 4 + 3] = 255;
    }
  }

  function inpaintImage(image: ImageData, rawMask: Uint8Array, width: number, height: number) {
    const data = image.data;
    let mask = new Uint8Array(rawMask);
    const originalMask = new Uint8Array(rawMask);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (minX > maxX || minY > maxY) return;
    const bounds = {
      minX: Math.max(1, minX - 8),
      minY: Math.max(1, minY - 8),
      maxX: Math.min(width - 2, maxX + 8),
      maxY: Math.min(height - 2, maxY + 8)
    };
    const maxPasses = Math.min(220, Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) + 12);

    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = 0;
      const nextMask = new Uint8Array(mask);
      const nextData = new Uint8ClampedArray(data);
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          const p = y * width + x;
          if (!mask[p]) continue;
          let r = 0;
          let g = 0;
          let b = 0;
          let total = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              const np = ny * width + nx;
              if (mask[np]) continue;
              const weight = 1 / Math.max(1, Math.abs(dx) + Math.abs(dy));
              const i = np * 4;
              r += data[i] * weight;
              g += data[i + 1] * weight;
              b += data[i + 2] * weight;
              total += weight;
            }
          }
          if (total > 0) {
            const i = p * 4;
            nextData[i] = r / total;
            nextData[i + 1] = g / total;
            nextData[i + 2] = b / total;
            nextData[i + 3] = 255;
            nextMask[p] = 0;
            changed += 1;
          }
        }
      }
      data.set(nextData);
      mask = nextMask;
      if (!changed) break;
    }

    for (let pass = 0; pass < 3; pass++) {
      const copy = new Uint8ClampedArray(data);
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          const p = y * width + x;
          if (!originalMask[p]) continue;
          let r = 0;
          let g = 0;
          let b = 0;
          let total = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const i = ((y + dy) * width + (x + dx)) * 4;
              r += copy[i];
              g += copy[i + 1];
              b += copy[i + 2];
              total += 1;
            }
          }
          const i = p * 4;
          data[i] = r / total;
          data[i + 1] = g / total;
          data[i + 2] = b / total;
        }
      }
    }
  }

  function harmonizeInpaint(image: ImageData, rawMask: Uint8Array, width: number, height: number) {
    const data = image.data;
    const original = new Uint8ClampedArray(data);
    const refined = dilateMask(rawMask, width, height, 1);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        if (!refined[p]) continue;

        let r = 0;
        let g = 0;
        let b = 0;
        let total = 0;
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const np = ny * width + nx;
            if (rawMask[np]) continue;
            const distance = Math.max(1, Math.abs(dx) + Math.abs(dy));
            const weight = 1 / distance;
            const i = np * 4;
            r += original[i] * weight;
            g += original[i + 1] * weight;
            b += original[i + 2] * weight;
            total += weight;
          }
        }

        if (total <= 0) continue;
        const i = p * 4;
        const blend = rawMask[p] ? 0.28 : 0.18;
        data[i] = data[i] * (1 - blend) + (r / total) * blend;
        data[i + 1] = data[i + 1] * (1 - blend) + (g / total) * blend;
        data[i + 2] = data[i + 2] * (1 - blend) + (b / total) * blend;
      }
    }
  }

  async function removeObject(targetSelection: SelectionBox = selection, options: RemovalOptions = {}) {
    if (!unlocked || locked) {
      notify("أدخل كود التفعيل أولا");
      return;
    }
    setStatus("removing");
    try {
      const originalForSave = /^data:image\/(png|jpe?g|webp);base64,/.test(imageUrl)
        ? imageUrl
        : getCanvas()?.canvas.toDataURL("image/png") ?? imageUrl;
      const output = makeResult(targetSelection, options);
      const response = await fetch("/api/remove-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          originalDataUrl: originalForSave,
          resultDataUrl: output
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر حفظ الصورة");
      if (payload.usage) setUsage(payload.usage);
      await refreshUsage();
      setStatus("done");
      notify("تمت إزالة العنصر مع حفظ الصورة");
    } catch (error) {
      setStatus("failed");
      notify(error instanceof Error ? error.message : "فشل، حاول مرة أخرى");
    }
  }

  async function removeWatermark() {
    if (!imageUrl) {
      notify("ارفع صورة أولا");
      return;
    }
    setStatus("analyzing");
    const detectedSelection = detectWatermarkSelection();
    setSelection(detectedSelection);
    setStatus("removing");
    await removeObject(detectedSelection, { preciseWatermark: true });
  }

  function downloadResult() {
    const link = document.createElement("a");
    link.href = resultUrl || imageUrl;
    link.download = "ai-eraser-result.png";
    link.click();
  }

  const usageLabel = usage ? `${usage.remaining_uses} من ${usage.total_uses} استخدام` : "0 من 0 استخدام";

  const canvasTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  const displayBox = getDisplayedImageBoxPercent();
  const selectionStyle = {
    left: `${displayBox.left + (selection.x / 100) * displayBox.width}%`,
    top: `${displayBox.top + (selection.y / 100) * displayBox.height}%`,
    width: `${(selection.w / 100) * displayBox.width}%`,
    height: `${(selection.h / 100) * displayBox.height}%`,
    transform: canvasTransform,
    transformOrigin: "center"
  };
  const imageAspect = imageRef.current
    ? `${imageRef.current.naturalWidth} / ${imageRef.current.naturalHeight}`
    : "920 / 492";

  return (
    <div className="relative">
      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-md border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-soft">
          {toast}
        </div>
      ) : null}
      <div className="editor-shell grid gap-5 lg:grid-cols-[1fr_240px]">
        <section className="glass-panel overflow-hidden rounded-lg">
          <div className="editor-toolbar flex min-h-[84px] flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={locked} className="h-12">
              <Upload className="h-5 w-5" />
              رفع صورة جديدة
            </Button>
            <Button variant="outline" onClick={removeCurrentImage} disabled={!imageUrl} className="h-12">
              <ImageOff className="h-5 w-5" />
              إزالة الصورة
            </Button>
            <label className="hidden">
              <input
                type="checkbox"
                checked={false}
                readOnly
                className="h-4 w-4 accent-violet-600"
              />
              إزالة العلامة بعد الرفع
            </label>
            <Button variant="soft" onClick={() => void removeWatermark()} disabled={locked || !unlocked || !imageUrl || status === "removing"} className="h-12">
              <WandSparkles className="h-5 w-5" />
              إزالة العلامة المائية
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
            <button className={cn("tool-button", tool === "crop" && "active")} onClick={() => setTool("crop")} type="button">
              <Crop className="h-6 w-6" />
              قص
            </button>
            <button className={cn("tool-button", tool === "brush" && "active")} onClick={() => setTool("brush")} type="button">
              <Brush className="h-6 w-6" />
              فرشاة
            </button>
            <button className={cn("tool-button", tool === "erase" && "active")} onClick={() => setTool("erase")} type="button">
              <Eraser className="h-6 w-6" />
              ممحاة
            </button>
            <label className="flex h-12 min-w-44 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
              <span>الحجم</span>
              <input
                type="range"
                min="8"
                max="90"
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
                className="w-20 accent-violet-600"
              />
              <span className="min-w-6 text-center">{brushSize}</span>
            </label>
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

          <div className="editor-canvases grid gap-5 p-5 xl:grid-cols-2">
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <span className="absolute right-4 top-4 z-10 rounded-md bg-slate-900/60 px-3 py-2 text-sm font-bold text-white">الصورة الأصلية</span>
              <div className="relative mx-auto w-full overflow-hidden" style={{ aspectRatio: imageAspect }}>
                <canvas
                  ref={canvasRef}
                  className={cn("h-full w-full object-contain", tool === "move" ? "cursor-grab" : "cursor-crosshair")}
                  style={{ transform: canvasTransform, transformOrigin: "center" }}
                  onMouseDown={onCanvasDown}
                  onMouseMove={onCanvasMove}
                  onMouseUp={onCanvasUp}
                  onMouseLeave={onCanvasUp}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply"
                  style={{ transform: canvasTransform, transformOrigin: "center" }}
                />
                <div
                  className="pointer-events-none absolute border-2 border-dashed border-blue-600"
                  style={selectionStyle}
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
              <div className="w-full" style={{ aspectRatio: imageAspect }}>
                {showAfter && resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultUrl} alt="بعد الإزالة" className="h-full w-full object-contain" />
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

          <div className="editor-actions flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
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
              {tool === "crop" ? (
                <Button variant="soft" onClick={applyCrop} disabled={locked || !unlocked || !imageUrl}>
                  <Crop className="h-5 w-5" />
                  تطبيق القص
                </Button>
              ) : null}
              <Button onClick={() => void removeObject()} disabled={locked || !unlocked || !imageUrl || status === "removing"}>
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
