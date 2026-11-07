import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { formatDate } from "@/lib/dates";
import { requirePermission } from "@/server/auth/actor";
import { listPeople, type PersonKind } from "@/server/services/people.service";
import { formatPhone } from "@/lib/phone";
import { Initials, KindBadge, RoleChips, StatusBadges } from "./person-badges";

const FILTERS: { kind: PersonKind | undefined; label: string }[] = [
  { kind: undefined, label: "Everyone" },
  { kind: "pupil", label: "Pupils" },
  { kind: "adult", label: "Adults" },
];

export default function PeoplePage({ searchParams }: PageProps<"/admin/people">) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">People</h1>
          <p className="text-slate-600">Everyone who can log in to Tsinda.</p>
        </div>
        <Link
          href="/admin/people/new"
          className="rounded-xl bg-brand-700 px-5 py-3 text-center text-lg font-bold text-white hover:bg-brand-800"
        >
          ➕ Add a person
        </Link>
      </div>

      <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
        <PeopleList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PeopleList({ searchParams }: { searchParams: PageProps<"/admin/people">["searchParams"] }) {
  const actor = await requirePermission("people:manage");
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const kind = params.kind === "pupil" || params.kind === "adult" ? params.kind : undefined;
  const people = await listPeople(actor, { search, kind });

  return (
    <>
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* A plain GET form: the search goes in the URL (?q=...), so it can be shared and survives a reload. */}
        <Form action="/admin/people" className="flex flex-1 gap-2">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <label htmlFor="people-search" className="sr-only">
            Search
          </label>
          <input
            id="people-search"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search by name, username or phone"
            className="min-h-12 flex-1 rounded-xl border-2 border-slate-300 px-4 text-lg outline-none focus:border-brand-600"
          />
          <button type="submit" className="rounded-xl bg-brand-700 px-5 font-bold text-white hover:bg-brand-800">
            Search
          </button>
        </Form>
        <div className="flex gap-1">
          {FILTERS.map((filter) => {
            const active = filter.kind === kind;
            const query = new URLSearchParams({ ...(search && { q: search }), ...(filter.kind && { kind: filter.kind }) });
            return (
              <Link
                key={filter.label}
                href={`/admin/people${query.size ? `?${query}` : ""}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl px-4 py-2 font-bold ${active ? "bg-brand-700 text-white" : "text-brand-800 hover:bg-brand-50"}`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      {people.length === 0 ? (
        <p className="rounded-3xl bg-white p-6 text-slate-600">Nobody found.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/admin/people/${person.id}`}
                className={`flex h-full flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-brand-600 ${person.isActive ? "" : "opacity-70"}`}
              >
                <div className="flex items-start gap-3">
                  <Initials name={person.fullName} kind={person.kind} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-lg font-extrabold text-ink">{person.fullName}</span>
                    <span className="text-sm text-slate-600">{person.username ?? formatPhone(person.phone)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <KindBadge kind={person.kind} />
                  <StatusBadges person={person} />
                  {person.kind === "adult" && <RoleChips roles={person.roles} />}
                </div>
                <span className="mt-auto text-sm text-slate-500">
                  {person.lastLoginAt ? `Last login: ${formatDate(person.lastLoginAt)}` : "Has never logged in"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
