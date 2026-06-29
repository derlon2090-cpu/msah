import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/ensure-db";
import { deleteStorageObject, uploadDataUrl } from "@/lib/storage";

export const imageRetentionDays = 10;

export function imageExpiresAt(from = new Date()) {
  return new Date(from.getTime() + imageRetentionDays * 24 * 60 * 60 * 1000);
}

export async function createProcessedImageAfterSuccess(input: {
  activationCodeId: string;
  originalDataUrl: string;
  resultDataUrl: string;
}) {
  await ensureDatabase();
  const original = await uploadDataUrl(input.originalDataUrl, "original");
  const result = await uploadDataUrl(input.resultDataUrl, "result");
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const decrement = await tx.activationCode.updateMany({
        where: {
          id: input.activationCodeId,
          isActive: true,
          remainingUses: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        },
        data: { remainingUses: { decrement: 1 } }
      });

      if (decrement.count !== 1) throw new Error("Activation code has no remaining uses");

      const image = await tx.processedImage.create({
        data: {
          activationCodeId: input.activationCodeId,
          originalImageUrl: original.url,
          resultImageUrl: result.url,
          originalStorageKey: original.key,
          resultStorageKey: result.key,
          expiresAt: imageExpiresAt(now)
        }
      });

      const usage = await tx.activationCode.findUniqueOrThrow({
        where: { id: input.activationCodeId },
        select: { id: true, totalUses: true, remainingUses: true }
      });

      return { image, usage };
    });
  } catch (error) {
    await Promise.allSettled([deleteStorageObject(original.key), deleteStorageObject(result.key)]);
    throw error;
  }
}

export async function markImageDeleted(id: string, activationCodeId?: string) {
  await ensureDatabase();
  const image = await prisma.processedImage.findFirst({
    where: { id, ...(activationCodeId ? { activationCodeId } : {}), deletedAt: null }
  });
  if (!image) return false;

  await Promise.allSettled([
    deleteStorageObject(image.originalStorageKey),
    deleteStorageObject(image.resultStorageKey)
  ]);

  await prisma.processedImage.update({
    where: { id: image.id },
    data: { deletedAt: new Date() }
  });

  return true;
}

export async function deleteExpiredImages() {
  await ensureDatabase();
  const expired = await prisma.processedImage.findMany({
    where: { expiresAt: { lt: new Date() }, deletedAt: null }
  });

  let deleted = 0;
  for (const image of expired) {
    await Promise.allSettled([
      deleteStorageObject(image.originalStorageKey),
      deleteStorageObject(image.resultStorageKey)
    ]);
    await prisma.processedImage.update({
      where: { id: image.id },
      data: { deletedAt: new Date() }
    });
    deleted += 1;
  }

  return { scanned: expired.length, deleted };
}
