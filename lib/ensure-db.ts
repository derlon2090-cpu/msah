import { getDatabaseUrl, prisma } from "@/lib/db";

let ensurePromise: Promise<void> | null = null;

async function createSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "activation_codes" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "customer_name" TEXT,
      "total_uses" INTEGER NOT NULL,
      "remaining_uses" INTEGER NOT NULL,
      "expires_at" TIMESTAMP(3),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "code_sessions" (
      "id" TEXT NOT NULL,
      "activation_code_id" TEXT NOT NULL,
      "session_token" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expires_at" TIMESTAMP(3) NOT NULL,
      "revoked_at" TIMESTAMP(3),
      CONSTRAINT "code_sessions_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "processed_images" (
      "id" TEXT NOT NULL,
      "activation_code_id" TEXT NOT NULL,
      "original_image_url" TEXT NOT NULL,
      "result_image_url" TEXT NOT NULL,
      "original_storage_key" TEXT NOT NULL,
      "result_storage_key" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expires_at" TIMESTAMP(3) NOT NULL,
      "deleted_at" TIMESTAMP(3),
      CONSTRAINT "processed_images_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "activation_codes_code_key" ON "activation_codes"("code");`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "code_sessions_session_token_key" ON "code_sessions"("session_token");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "code_sessions_activation_code_id_idx" ON "code_sessions"("activation_code_id");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "code_sessions_expires_at_idx" ON "code_sessions"("expires_at");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "processed_images_activation_code_id_idx" ON "processed_images"("activation_code_id");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "processed_images_expires_at_deleted_at_idx" ON "processed_images"("expires_at", "deleted_at");`);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'code_sessions_activation_code_id_fkey'
      ) THEN
        ALTER TABLE "code_sessions"
          ADD CONSTRAINT "code_sessions_activation_code_id_fkey"
          FOREIGN KEY ("activation_code_id") REFERENCES "activation_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'processed_images_activation_code_id_fkey'
      ) THEN
        ALTER TABLE "processed_images"
          ADD CONSTRAINT "processed_images_activation_code_id_fkey"
          FOREIGN KEY ("activation_code_id") REFERENCES "activation_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END
    $$;
  `);
}

export async function ensureDatabase() {
  if (!getDatabaseUrl()) {
    throw new Error("DATABASE_URL غير موجود في Vercel Production. أضفه لكل البيئات أو أضف POSTGRES_URL من Neon.");
  }

  ensurePromise ??= createSchema().catch((error) => {
    ensurePromise = null;
    throw error;
  });
  return ensurePromise;
}
