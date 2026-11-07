"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { approveAction, requestChangeAction, type ReviewActionState } from "./actions";

type ReviewControlsProps = {
  kind: "lesson" | "question";
  itemKey: string;
  status: "DRAFT" | "PUBLISHED";
};

const initialState: ReviewActionState = {};

// "Approve" and "Needs a change" for one lesson or question.
export function ReviewControls({ kind, itemKey, status }: ReviewControlsProps) {
  const [writingNote, setWritingNote] = useState(false);
  const [approveState, approve, approving] = useActionState(approveAction, initialState);
  const [changeState, sendChange, sending] = useActionState(
    async (previous: ReviewActionState, formData: FormData) => {
      const result = await requestChangeAction(previous, formData);
      if (result.done) setWritingNote(false); // Close the note box once it is sent.
      return result;
    },
    initialState,
  );

  const message = changeState.done ?? approveState.done;
  const error = approveState.error ?? changeState.error;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-ink">
        Status:{" "}
        {status === "PUBLISHED" ? (
          <span className="text-green-700">✅ Approved: pupils can see this</span>
        ) : (
          <span className="text-amber-700">⏳ To review: pupils cannot see this yet</span>
        )}
      </p>

      {!writingNote && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {status === "DRAFT" && (
            <form action={approve} className="flex-1">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="key" value={itemKey} />
              <Button type="submit" disabled={approving}>
                {approving ? "Approving..." : "✅ Approve"}
              </Button>
            </form>
          )}
          <div className="flex-1">
            <Button type="button" variant="secondary" onClick={() => setWritingNote(true)}>
              ✏️ Needs a change
            </Button>
          </div>
        </div>
      )}

      {writingNote && (
        <form action={sendChange} className="flex flex-col gap-2">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="key" value={itemKey} />
          <label htmlFor={`note-${itemKey}`} className="text-sm font-bold text-ink">
            What should change?
          </label>
          <textarea
            id={`note-${itemKey}`}
            name="note"
            required
            rows={3}
            className="rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base focus:border-brand-600 focus:outline-none"
            placeholder="For example: the answer should be 2 1/3, not 7/3."
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={sending} className="sm:flex-1">
              {sending ? "Sending..." : "Send note"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setWritingNote(false)} className="sm:flex-1">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {message && <p className="text-sm font-medium text-green-700">{message}</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
