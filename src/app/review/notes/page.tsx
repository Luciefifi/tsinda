import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/server/auth/actor";
import { listOpenNotes } from "@/server/services/review.service";
import { resolveNoteAction } from "../actions";

export const metadata: Metadata = { title: "Changes to make · Tsinda" };

export default function NotesPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <Notes />
    </Suspense>
  );
}

async function Notes() {
  const actor = await requirePermission("content:edit");
  const notes = await listOpenNotes(actor);

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/review" className="text-sm font-bold text-brand-700 underline">
          ← Review content
        </Link>
        <h1 className="text-2xl font-bold text-ink">Changes to make</h1>
        <p className="text-slate-600">
          Fix the content file, load it again, then mark the note as done. The item goes back to draft so it is
          reviewed again.
        </p>
      </div>

      {notes.length === 0 && <p className="rounded-2xl bg-white p-5 text-green-700">✅ Nothing to change.</p>}

      <ul className="grid gap-3 lg:grid-cols-2">
        {notes.map((note) => {
          const topicKey = note.lesson?.topic.key ?? note.question?.topic.key;
          const what = note.lesson ? `Lesson: ${note.lesson.title}` : `Question: ${note.question?.sourceRef}`;
          return (
            <li key={note.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">{what}</p>
              <p className="text-lg text-ink">“{note.note}”</p>
              <p className="text-sm text-slate-500">
                {note.author?.fullName ?? "A former reviewer"} · {note.createdAt.toLocaleDateString("en-GB")}
                {topicKey && (
                  <>
                    {" · "}
                    <Link href={`/review/topics/${topicKey}`} className="font-bold text-brand-700 underline">
                      Open
                    </Link>
                  </>
                )}
              </p>
              <form action={resolveNoteAction}>
                <input type="hidden" name="noteId" value={note.id} />
                <Button type="submit" variant="secondary">
                  Mark as done
                </Button>
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}
