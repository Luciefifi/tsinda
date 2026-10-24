-- CreateTable
CREATE TABLE "sessions" (
    "id" CHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "remember_device" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── CHECK constraints (added by hand: Prisma can't express these) ───

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_id_sha256_hex" CHECK ("id" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "sessions_expires_after_created" CHECK ("expires_at" > "created_at");
