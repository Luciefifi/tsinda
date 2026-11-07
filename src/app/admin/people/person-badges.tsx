import type { PersonKind, PersonSummary } from "@/server/services/people.service";

// Small coloured labels that show a person's kind and account state.

export function KindBadge({ kind }: { kind: PersonSummary["kind"] }) {
  return kind === "pupil" ? (
    <span className="rounded-full bg-sun-400/30 px-2.5 py-1 text-xs font-bold text-amber-900">🎒 Pupil</span>
  ) : (
    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-800">🧑‍🏫 Adult</span>
  );
}

export function StatusBadges({ person }: { person: Pick<PersonSummary, "isActive" | "isLocked" | "mustChangePassword"> }) {
  return (
    <>
      {!person.isActive && (
        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">⏸️ Turned off</span>
      )}
      {person.isLocked && (
        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">🔒 Locked</span>
      )}
      {person.isActive && person.mustChangePassword && (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
          🔑 Temporary password
        </span>
      )}
    </>
  );
}

export function RoleChips({ roles }: { roles: PersonSummary["roles"] }) {
  return (
    <>
      {roles.map((role) => (
        <span key={role.key} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {role.name}
        </span>
      ))}
    </>
  );
}

// A round avatar with the first letters of the name.
export function Initials({ name, kind, size = "md" }: { name: string; kind: PersonKind; size?: "md" | "lg" }) {
  const letters = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colours = kind === "pupil" ? "bg-sun-400 text-ink" : "bg-brand-700 text-white";
  const dimensions = size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-2xl font-extrabold ${colours} ${dimensions}`}>
      {letters}
    </span>
  );
}
