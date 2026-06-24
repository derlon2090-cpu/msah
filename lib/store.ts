import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ActivationCode, PricingPlan, ProcessedImage } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase";

type DataShape = {
  activation_codes: ActivationCode[];
  processed_images: ProcessedImage[];
  pricing: PricingPlan[];
  settings: {
    max_image_mb: number;
  };
};

const dataDir = path.join(process.cwd(), ".data");
const uploadDir = path.join(process.cwd(), "public", "uploads");
const dataFile = path.join(dataDir, "db.json");

const defaultPricing: PricingPlan[] = [
  { id: "trial", name: "تجربة", uses: "5 استخدامات", price: "مجانا" },
  { id: "basic", name: "أساسي", uses: "50 استخدام", price: "49 ر.س" },
  { id: "pro", name: "احترافي", uses: "200 استخدام", price: "149 ر.س", featured: true },
  { id: "business", name: "أعمال", uses: "استخدامات مخصصة", price: "تواصل معنا" }
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

async function ensureLocalData() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    const now = nowIso();
    const seed: DataShape = {
      activation_codes: [
        {
          id: randomUUID(),
          code: "DEMO-2026",
          customer_name: "عميل تجريبي",
          total_uses: 20,
          remaining_uses: 18,
          expires_at: null,
          is_active: true,
          notes: "كود مبدئي لتجربة المحرر",
          created_at: now,
          updated_at: now
        }
      ],
      processed_images: [],
      pricing: defaultPricing,
      settings: {
        max_image_mb: 25
      }
    };
    await fs.writeFile(dataFile, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readLocal(): Promise<DataShape> {
  await ensureLocalData();
  const data = JSON.parse(await fs.readFile(dataFile, "utf8")) as Partial<DataShape>;
  return {
    activation_codes: data.activation_codes ?? [],
    processed_images: data.processed_images ?? [],
    pricing: data.pricing?.length ? data.pricing : defaultPricing,
    settings: {
      max_image_mb: data.settings?.max_image_mb ?? 25
    }
  };
}

async function writeLocal(data: DataShape) {
  await ensureLocalData();
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
}

export async function saveDataUrl(dataUrl: string, prefix: string) {
  await fs.mkdir(uploadDir, { recursive: true });
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) throw new Error("صيغة الصورة غير مدعومة");

  const ext = match[2] === "jpeg" ? "jpg" : match[2];
  const fileName = `${prefix}-${Date.now()}-${randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, Buffer.from(match[3], "base64"));
  return `/uploads/${fileName}`;
}

export async function getAllCodes() {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("activation_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) return data as ActivationCode[];
  }

  const db = await readLocal();
  return [...db.activation_codes].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCodeByValue(code: string) {
  const normalized = normalizeCode(code);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("activation_codes")
      .select("*")
      .eq("code", normalized)
      .maybeSingle();
    if (!error) return data as ActivationCode | null;
  }

  const db = await readLocal();
  return db.activation_codes.find((item) => item.code === normalized) ?? null;
}

export function isCodeUsable(code: ActivationCode) {
  const expired = code.expires_at ? new Date(code.expires_at).getTime() < Date.now() : false;
  return code.is_active && !expired && code.remaining_uses > 0;
}

export async function createCode(input: Partial<ActivationCode> & { code: string; total_uses: number }) {
  const now = nowIso();
  const payload: ActivationCode = {
    id: randomUUID(),
    code: normalizeCode(input.code),
    customer_name: input.customer_name ?? null,
    total_uses: Number(input.total_uses),
    remaining_uses: Number(input.remaining_uses ?? input.total_uses),
    expires_at: input.expires_at || null,
    is_active: Boolean(input.is_active ?? true),
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("activation_codes").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return data as ActivationCode;
  }

  const db = await readLocal();
  db.activation_codes.unshift(payload);
  await writeLocal(db);
  return payload;
}

export async function updateCode(id: string, patch: Partial<ActivationCode>) {
  const normalizedPatch: Partial<ActivationCode> = {
    ...patch,
    updated_at: nowIso()
  };
  if (patch.code) normalizedPatch.code = normalizeCode(patch.code);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("activation_codes")
      .update(normalizedPatch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as ActivationCode;
  }

  const db = await readLocal();
  const index = db.activation_codes.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("الكود غير موجود");
  db.activation_codes[index] = { ...db.activation_codes[index], ...normalizedPatch };
  await writeLocal(db);
  return db.activation_codes[index];
}

export async function deleteCode(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("activation_codes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }

  const db = await readLocal();
  db.activation_codes = db.activation_codes.filter((item) => item.id !== id);
  db.processed_images = db.processed_images.filter((item) => item.activation_code_id !== id);
  await writeLocal(db);
}

export async function decrementUse(id: string) {
  const code = (await getAllCodes()).find((item) => item.id === id);
  if (!code || !isCodeUsable(code)) throw new Error("الكود غير صالح للاستخدام");
  return updateCode(id, { remaining_uses: code.remaining_uses - 1 });
}

export async function addProcessedImage(input: Omit<ProcessedImage, "id" | "created_at">) {
  const payload: ProcessedImage = {
    id: randomUUID(),
    ...input,
    created_at: nowIso()
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("processed_images").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return data as ProcessedImage;
  }

  const db = await readLocal();
  db.processed_images.unshift(payload);
  await writeLocal(db);
  return payload;
}

export async function getImages(activationCodeId?: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    let query = supabase.from("processed_images").select("*").order("created_at", { ascending: false });
    if (activationCodeId) query = query.eq("activation_code_id", activationCodeId);
    const { data, error } = await query;
    if (!error && data) return data as ProcessedImage[];
  }

  const db = await readLocal();
  return db.processed_images
    .filter((item) => !activationCodeId || item.activation_code_id === activationCodeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function deleteImage(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("processed_images").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }

  const db = await readLocal();
  db.processed_images = db.processed_images.filter((item) => item.id !== id);
  await writeLocal(db);
}

export async function getPricing() {
  const db = await readLocal();
  return db.pricing?.length ? db.pricing : defaultPricing;
}

export async function updatePricing(plans: PricingPlan[]) {
  const db = await readLocal();
  db.pricing = plans;
  await writeLocal(db);
  return plans;
}

export async function getSettings() {
  const db = await readLocal();
  return db.settings;
}

export async function updateSettings(settings: Partial<DataShape["settings"]>) {
  const db = await readLocal();
  db.settings = {
    ...db.settings,
    ...settings
  };
  await writeLocal(db);
  return db.settings;
}
