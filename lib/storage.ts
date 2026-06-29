import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getClient() {
  return new S3Client({
    endpoint: requiredEnv("S3_ENDPOINT"),
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY")
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
  });
}

export function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !allowedTypes.has(match[1])) throw new Error("Invalid image data");
  const contentType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const extension = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
  return {
    buffer: Buffer.from(match[2], "base64"),
    contentType,
    extension
  };
}

export async function uploadDataUrl(dataUrl: string, prefix: "original" | "result") {
  const parsed = parseImageDataUrl(dataUrl);
  const bucket = requiredEnv("S3_BUCKET");
  const key = `${prefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${parsed.extension}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: parsed.buffer,
      ContentType: parsed.contentType,
      CacheControl: "private, max-age=86400"
    })
  );

  const publicBase = requiredEnv("S3_PUBLIC_BASE_URL").replace(/\/$/, "");
  return {
    key,
    url: `${publicBase}/${key}`
  };
}

export async function deleteStorageObject(key: string) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: requiredEnv("S3_BUCKET"),
      Key: key
    })
  );
}
