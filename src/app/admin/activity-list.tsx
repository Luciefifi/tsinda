import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/dates";
import { relationshipLabel } from "@/lib/relationships";
import type { ActivityEntry } from "@/server/services/people.service";

const ICONS: Record<ActivityEntry["action"], string> = {
  person_created: "➕",
  person_updated: "✏️",
  roles_changed: "🎭",
  guardian_linked: "👪",
  guardian_unlinked: "👪",
  password_reset: "🔑",
  pin_reset: "🔢",
  account_unlocked: "🔓",
  account_turned_off: "⏸️",
  account_turned_on: "▶️",
  password_changed: "🔑",
  role_created: "🎭",
  role_updated: "🎭",
  role_permissions_changed: "✅",
  role_deleted: "🗑️",
};

// The activity log as sentences: "Fifi reset Ingabire's password".
export function ActivityList({ entries, empty = "Nothing has happened yet." }: { entries: ActivityEntry[]; empty?: string }) {
  if (entries.length === 0) return <p className="text-slate-500">{empty}</p>;

  return (
    <ol className="flex flex-col divide-y divide-slate-100">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3 py-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            {ICONS[entry.action]}
          </span>
          <div className="flex flex-col">
            <p className="text-ink">{describe(entry)}</p>
            <p className="text-sm text-slate-500">{formatDateTime(entry.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function list(value: unknown): string {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "none";
}

function describe(entry: ActivityEntry): ReactNode {
  const who = <strong>{entry.actorName ?? "Someone"}</strong>;
  const target = entry.targetUser ? (
    <Link href={`/admin/people/${entry.targetUser.id}`} className="font-bold text-brand-700 underline">
      {entry.targetUser.fullName}
    </Link>
  ) : (
    <strong>someone</strong>
  );
  const d = entry.details;

  switch (entry.action) {
    case "person_created":
      return <>{who} added {target} as {d.kind === "pupil" ? "a pupil" : "an adult"}</>;
    case "person_updated":
      return <>{who} changed {target}&apos;s {list(d.changed)}</>;
    case "roles_changed":
      return <>{who} changed {target}&apos;s roles (added: {list(d.added)}; removed: {list(d.removed)})</>;
    case "guardian_linked":
      return <>{who} linked {String(d.guardian)} to {target} as {relationshipLabel(String(d.relationship)).toLowerCase()}</>;
    case "guardian_unlinked":
      return <>{who} removed {String(d.guardian)} as a guardian of {target}</>;
    case "password_reset":
      return <>{who} set a temporary password for {target}</>;
    case "pin_reset":
      return <>{who} set a new PIN for {target}</>;
    case "account_unlocked":
      return <>{who} unlocked {target}</>;
    case "account_turned_off":
      return <>{who} turned off {target}&apos;s account</>;
    case "account_turned_on":
      return <>{who} turned on {target}&apos;s account</>;
    case "password_changed":
      return <>{who} changed their own password</>;
    case "role_created":
      return <>{who} created the role <strong>{String(d.name)}</strong></>;
    case "role_updated":
      return d.previousName !== d.name ? (
        <>{who} renamed the role {String(d.previousName)} to <strong>{String(d.name)}</strong></>
      ) : (
        <>{who} changed the description of <strong>{String(d.name)}</strong></>
      );
    case "role_permissions_changed":
      return <>{who} changed what <strong>{String(d.role)}</strong> can do (added: {list(d.added)}; removed: {list(d.removed)})</>;
    case "role_deleted":
      return <>{who} deleted the role <strong>{String(d.role)}</strong></>;
  }
}
