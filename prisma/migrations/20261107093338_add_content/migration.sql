-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "stimulus_kind" AS ENUM ('PASSAGE', 'TABLE', 'DIAGRAM');

-- CreateEnum
CREATE TYPE "question_source" AS ENUM ('PUPIL_BOOK', 'PAST_PAPER', 'MOCK', 'TSINDA');

-- CreateEnum
CREATE TYPE "answer_type" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'CLOZE', 'NUMBER', 'TEXT', 'GIVE_N', 'ORDERING', 'CLASSIFY', 'WORKED', 'FREE_RESPONSE');

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "grade" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "key_competence" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "unit_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "topic_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "content_hash" TEXT NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stimuli" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "stimulus_kind" NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stimuli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "topic_id" UUID NOT NULL,
    "stimulus_id" UUID,
    "source" "question_source" NOT NULL,
    "source_ref" TEXT NOT NULL,
    "instructions" TEXT,
    "needs_picture" BOOLEAN NOT NULL DEFAULT false,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "content_hash" TEXT NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_parts" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "answer_type" "answer_type" NOT NULL,
    "answer_spec" JSONB NOT NULL,
    "marking_scheme" TEXT,
    "model_answer" TEXT,
    "explanation" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "question_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_key_key" ON "subjects"("key");

-- CreateIndex
CREATE UNIQUE INDEX "units_key_key" ON "units"("key");

-- CreateIndex
CREATE UNIQUE INDEX "units_subject_id_grade_number_key" ON "units"("subject_id", "grade", "number");

-- CreateIndex
CREATE UNIQUE INDEX "topics_key_key" ON "topics"("key");

-- CreateIndex
CREATE UNIQUE INDEX "topics_unit_id_number_key" ON "topics"("unit_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_key_key" ON "lessons"("key");

-- CreateIndex
CREATE INDEX "lessons_reviewed_by_id_idx" ON "lessons"("reviewed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_topic_id_sort_order_key" ON "lessons"("topic_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "stimuli_key_key" ON "stimuli"("key");

-- CreateIndex
CREATE UNIQUE INDEX "questions_key_key" ON "questions"("key");

-- CreateIndex
CREATE INDEX "questions_topic_id_status_idx" ON "questions"("topic_id", "status");

-- CreateIndex
CREATE INDEX "questions_stimulus_id_idx" ON "questions"("stimulus_id");

-- CreateIndex
CREATE INDEX "questions_reviewed_by_id_idx" ON "questions"("reviewed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_parts_question_id_label_key" ON "question_parts"("question_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "question_parts_question_id_sort_order_key" ON "question_parts"("question_id", "sort_order");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_stimulus_id_fkey" FOREIGN KEY ("stimulus_id") REFERENCES "stimuli"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_parts" ADD CONSTRAINT "question_parts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;



ALTER TABLE "subjects"
  ADD CONSTRAINT "subjects_key_format" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "subjects_sort_order_not_negative" CHECK ("sort_order" >= 0);

ALTER TABLE "units"
  ADD CONSTRAINT "units_key_format" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "units_grade_upper_primary" CHECK ("grade" BETWEEN 4 AND 6),
  ADD CONSTRAINT "units_number_positive" CHECK ("number" > 0);

ALTER TABLE "topics"
  ADD CONSTRAINT "topics_key_format" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "topics_number_positive" CHECK ("number" > 0);

ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_key_format" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "lessons_sort_order_not_negative" CHECK ("sort_order" >= 0),
  ADD CONSTRAINT "lessons_content_hash_sha256" CHECK ("content_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "lessons_published_was_reviewed" CHECK ("status" <> 'PUBLISHED' OR "reviewed_at" IS NOT NULL);

ALTER TABLE "stimuli"
  ADD CONSTRAINT "stimuli_key_format" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_key_format" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "questions_source_ref_not_blank" CHECK (btrim("source_ref") <> ''),
  ADD CONSTRAINT "questions_content_hash_sha256" CHECK ("content_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "questions_published_was_reviewed" CHECK ("status" <> 'PUBLISHED' OR "reviewed_at" IS NOT NULL);

ALTER TABLE "question_parts"
  ADD CONSTRAINT "question_parts_label_format" CHECK ("label" ~ '^[a-z0-9()]*$'),
  ADD CONSTRAINT "question_parts_sort_order_not_negative" CHECK ("sort_order" >= 0),
  ADD CONSTRAINT "question_parts_marks_positive" CHECK ("marks" > 0),
  ADD CONSTRAINT "question_parts_answer_spec_is_object" CHECK (jsonb_typeof("answer_spec") = 'object'),
  ADD CONSTRAINT "question_parts_answer_spec_matches_type" CHECK ("answer_spec" ->> 'type' = lower("answer_type"::text));

