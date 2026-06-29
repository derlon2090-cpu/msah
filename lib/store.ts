import fs from "fs/promises";
import path from "path";
import { PricingPlan } from "@/lib/types";

type DataShape = {
  pricing: PricingPlan[];
  settings: {
    max_image_mb: number;
  };
};

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "pricing.json");

const defaultPricing: PricingPlan[] = [
  { id: "trial", name: "تجربة", uses: "5 استخدامات", price: "مجانا" },
  { id: "basic", name: "أساسي", uses: "50 استخدام", price: "49 ر.س" },
  { id: "pro", name: "احترافي", uses: "200 استخدام", price: "149 ر.س", featured: true },
  { id: "business", name: "أعمال", uses: "استخدامات مخصصة", price: "تواصل معنا" }
];

function defaultData(): DataShape {
  return {
    pricing: defaultPricing,
    settings: {
      max_image_mb: Number(process.env.MAX_IMAGE_MB ?? 25)
    }
  };
}

async function readData(): Promise<DataShape> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const data = JSON.parse(await fs.readFile(dataFile, "utf8")) as Partial<DataShape>;
    return {
      pricing: data.pricing?.length ? data.pricing : defaultPricing,
      settings: {
        max_image_mb: data.settings?.max_image_mb ?? Number(process.env.MAX_IMAGE_MB ?? 25)
      }
    };
  } catch {
    return defaultData();
  }
}

async function writeData(data: DataShape) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
}

export async function getPricing() {
  const db = await readData();
  return db.pricing;
}

export async function updatePricing(plans: PricingPlan[]) {
  const db = await readData();
  db.pricing = plans;
  await writeData(db);
  return db.pricing;
}

export async function getSettings() {
  const db = await readData();
  return db.settings;
}

export async function updateSettings(settings: Partial<DataShape["settings"]>) {
  const db = await readData();
  db.settings = {
    ...db.settings,
    ...settings
  };
  await writeData(db);
  return db.settings;
}
