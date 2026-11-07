"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { ForbiddenError } from "@/server/auth/access";
import { requireActor } from "@/server/auth/actor";
import {
  approveLesson,
  approveQuestion,
  requestChange,
  resolveNote,
  ReviewError,
} from "@/server/services/review.service";

export type ReviewActionState = { done?: string; error?: string };

const targetSchema = z.object({
  kind: z.enum(["lesson", "question"]),
  key: z.string().min(1),
});

// Runs a review action and turns expected failures into a message.
async function run(action: () => Promise<void>, done: string): Promise<ReviewActionState> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ReviewError) return { error: error.message };
    if (error instanceof ForbiddenError) return { error: "You are not allowed to do this." };
    throw error;
  }
  refresh();
  return { done };
}

export async function approveAction(_previous: ReviewActionState, formData: FormData): Promise<ReviewActionState> {
  const actor = await requireActor();
  const target = targetSchema.parse({ kind: formData.get("kind"), key: formData.get("key") });

  return run(
    () => (target.kind === "lesson" ? approveLesson(actor, target.key) : approveQuestion(actor, target.key)),
    "Approved.",
  );
}

export async function requestChangeAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const actor = await requireActor();
  const target = targetSchema.parse({ kind: formData.get("kind"), key: formData.get("key") });
  const note = String(formData.get("note") ?? "");

  return run(() => requestChange(actor, target, note), "Thank you. Your note was sent.");
}

export async function resolveNoteAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const noteId = z.uuid().parse(formData.get("noteId"));
  await resolveNote(actor, noteId);
  refresh();
}
