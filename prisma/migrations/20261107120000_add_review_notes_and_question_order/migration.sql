-- DropIndex
DROP INDEX "questions_topic_id_status_idx";

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "review_notes" (
    "id" UUID NOT NULL,
    "lesson_id" UUID,
    "question_id" UUID,
    "author_id" UUID,
    "note" TEXT NOT NULL,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_notes_lesson_id_idx" ON "review_notes"("lesson_id");

-- CreateIndex
CREATE INDEX "review_notes_question_id_idx" ON "review_notes"("question_id");

-- CreateIndex
CREATE INDEX "review_notes_author_id_idx" ON "review_notes"("author_id");

-- CreateIndex
CREATE INDEX "review_notes_resolved_by_id_idx" ON "review_notes"("resolved_by_id");

-- CreateIndex
CREATE INDEX "review_notes_resolved_at_idx" ON "review_notes"("resolved_at");

-- CreateIndex
CREATE INDEX "questions_topic_id_status_sort_order_idx" ON "questions"("topic_id", "status", "sort_order");

-- AddForeignKey
ALTER TABLE "review_notes" ADD CONSTRAINT "review_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_notes" ADD CONSTRAINT "review_notes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_notes" ADD CONSTRAINT "review_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_notes" ADD CONSTRAINT "review_notes_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── CHECK constraints (added by hand: Prisma can't express these) ───

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_sort_order_not_negative" CHECK ("sort_order" >= 0);

ALTER TABLE "review_notes"
  ADD CONSTRAINT "review_notes_exactly_one_target" CHECK (num_nonnulls("lesson_id", "question_id") = 1),
  ADD CONSTRAINT "review_notes_note_not_blank" CHECK (btrim("note") <> ''),
  ADD CONSTRAINT "review_notes_resolver_has_date" CHECK ("resolved_by_id" IS NULL OR "resolved_at" IS NOT NULL);
