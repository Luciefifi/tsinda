// The "needs a change" notes still waiting for the admin, shown above an item.
type OpenNote = { id: string; note: string; author: { fullName: string } | null };

export function OpenNotes({ notes }: { notes: OpenNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-bold text-amber-900">✏️ Waiting for a change:</p>
      <ul className="flex flex-col gap-2">
        {notes.map((note) => (
          <li key={note.id} className="text-sm text-amber-900">
            “{note.note}” <span className="text-amber-700">· {note.author?.fullName ?? "a former reviewer"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
