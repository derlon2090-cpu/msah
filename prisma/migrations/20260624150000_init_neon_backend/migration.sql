CREATE TABLE "activation_codes" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "customer_name" TEXT,
  "total_uses" INTEGER NOT NULL,
  "remaining_uses" INTEGER NOT NULL,
  "expires_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "code_sessions" (
  "id" TEXT NOT NULL,
  "activation_code_id" TEXT NOT NULL,
  "session_token" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "code_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "processed_images" (
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

CREATE UNIQUE INDEX "activation_codes_code_key" ON "activation_codes"("code");
CREATE UNIQUE INDEX "code_sessions_session_token_key" ON "code_sessions"("session_token");
CREATE INDEX "code_sessions_activation_code_id_idx" ON "code_sessions"("activation_code_id");
CREATE INDEX "code_sessions_expires_at_idx" ON "code_sessions"("expires_at");
CREATE INDEX "processed_images_activation_code_id_idx" ON "processed_images"("activation_code_id");
CREATE INDEX "processed_images_expires_at_deleted_at_idx" ON "processed_images"("expires_at", "deleted_at");

ALTER TABLE "code_sessions"
  ADD CONSTRAINT "code_sessions_activation_code_id_fkey"
  FOREIGN KEY ("activation_code_id") REFERENCES "activation_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "processed_images"
  ADD CONSTRAINT "processed_images_activation_code_id_fkey"
  FOREIGN KEY ("activation_code_id") REFERENCES "activation_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
