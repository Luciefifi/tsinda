import Link from "next/link";
import { Suspense } from "react";
import { formatDateTime } from "@/lib/dates";
import { requirePermission } from "@/server/auth/actor";
import { getAdminOverview } from "@/server/services/people.service";
import { ActivityList } from "./activity-list";

export default function AdminHomePage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const actor = await requirePermission("people:manage");
  const overview = await getAdminOverview(actor);

  // Things that need the admin's attention come first.
  const alerts = [
    overview.locked > 0 && {
      text: `${overview.locked} ${overview.locked === 1 ? "account is" : "accounts are"} locked after too many wrong tries`,
      href: "/admin/people",
    },
    overview.waitingForNewPassword > 0 && {
      text: `${overview.waitingForNewPassword} ${overview.waitingForNewPassword === 1 ? "person has" : "people have"} not chosen their own password yet`,
      href: "/admin/people?kind=adult",
    },
    overview.content &&
      overview.content.openNotes > 0 && {
        text: `${overview.content.openNotes} change ${overview.content.openNotes === 1 ? "note is" : "notes are"} waiting`,
        href: "/review/notes",
      },
  ].filter((alert) => alert !== false && alert !== null);

  return (
    <>
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white shadow-lg shadow-brand-700/30 sm:p-8">
        <span aria-hidden="true" className="absolute -top-4 -right-2 text-8xl opacity-15">
          ⚙️
        </span>
        <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-bold">Admin</p>
        <h1 className="text-3xl font-extrabold">Hello, {actor.fullName}!</h1>
        <p className="mt-2 text-brand-100">Manage the people who use Tsinda and what each of them can do.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/people/new" className="rounded-xl bg-sun-400 px-4 py-2 font-bold text-ink hover:bg-amber-300">
            ➕ Add a person
          </Link>
          <Link href="/admin/roles" className="rounded-xl bg-white/15 px-4 py-2 font-bold hover:bg-white/25">
            🎭 Roles
          </Link>
        </div>
      </header>

      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="🎒" label="Pupils" value={overview.pupils} href="/admin/people?kind=pupil" />
        <Stat icon="🧑‍🏫" label="Adults" value={overview.adults} href="/admin/people?kind=adult" />
        <Stat icon="⏸️" label="Turned off" value={overview.turnedOff} href="/admin/people" />
        {overview.content ? (
          <Stat icon="📝" label="Content to review" value={overview.content.toReview} href="/review" />
        ) : (
          <Stat icon="🔒" label="Locked" value={overview.locked} href="/admin/people" />
        )}
      </section>

      {alerts.length > 0 && (
        <section className="flex flex-col gap-2 rounded-3xl border-2 border-sun-400 bg-amber-50 p-5">
          <h2 className="text-lg font-extrabold text-amber-900">⚠️ Needs your attention</h2>
          <ul className="flex flex-col gap-1">
            {alerts.map((alert) => (
              <li key={alert.text}>
                <Link href={alert.href} className="font-medium text-amber-900 underline">
                  {alert.text}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="rounded-3xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-1 text-xl font-extrabold text-ink">Latest activity</h2>
          <p className="mb-2 text-sm text-slate-500">Every change to people and roles is recorded here.</p>
          <ActivityList entries={overview.activity} />
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xl font-extrabold text-ink">Last logins</h2>
          {overview.recentLogins.length === 0 ? (
            <p className="text-slate-500">Nobody has logged in yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {overview.recentLogins.map((person) => (
                <li key={person.id} className="flex flex-col py-2">
                  <Link href={`/admin/people/${person.id}`} className="font-bold text-brand-700 underline">
                    {person.fullName}
                  </Link>
                  <span className="text-sm text-slate-500">{formatDateTime(person.lastLoginAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ icon, label, value, href }: { icon: string; label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-3xl bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-brand-600"
    >
      <span aria-hidden="true" className="text-2xl">
        {icon}
      </span>
      <span className="text-3xl font-extrabold text-ink">{value}</span>
      <span className="font-bold text-slate-600">{label}</span>
    </Link>
  );
}
