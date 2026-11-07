-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target_user_id" UUID,
    "target_role_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_user_id_created_at_idx" ON "audit_logs"("target_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_role_id_idx" ON "audit_logs"("target_role_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_role_id_fkey" FOREIGN KEY ("target_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── CHECK constraints (added by hand: Prisma can't express these) ───

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_action_format" CHECK ("action" ~ '^[a-z]+(_[a-z]+)*$'),
  ADD CONSTRAINT "audit_logs_details_is_object" CHECK (jsonb_typeof("details") = 'object');

-- The relationships the "Who looks after this pupil?" form offers.
ALTER TABLE "guardianships"
  ADD CONSTRAINT "guardianships_relationship_known"
  CHECK ("relationship" IS NULL OR "relationship" IN ('parent', 'grandparent', 'aunt_uncle', 'sibling', 'teacher', 'other'));

ALTER TABLE "roles"
  ADD CONSTRAINT "roles_name_not_blank" CHECK (btrim("name") <> '');

-- Two roles can't share a name, whatever the capital letters.
CREATE UNIQUE INDEX "roles_name_lower_key" ON "roles" (lower("name"));
