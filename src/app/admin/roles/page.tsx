import Link from "next/link";
import { Suspense } from "react";
import { PERMISSIONS } from "@/server/auth/permissions";
import { requirePermission } from "@/server/auth/actor";
import { listRoles } from "@/server/services/roles.service";

export default function RolesPage() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Roles</h1>
          <p className="text-slate-600">A role is a set of things a person may do. A person can have several roles.</p>
        </div>
        <Link
          href="/admin/roles/new"
          className="rounded-xl bg-brand-700 px-5 py-3 text-center text-lg font-bold text-white hover:bg-brand-800"
        >
          ➕ New role
        </Link>
      </div>
      <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
        <RoleList />
      </Suspense>
    </>
  );
}

const ICONS: Record<string, string> = { admin: "⚙️", student: "🎒", guardian: "👪", reviewer: "📝" };

async function RoleList() {
  const actor = await requirePermission("roles:manage");
  const roles = await listRoles(actor);

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {roles.map((role) => (
        <li key={role.key}>
          <Link
            href={`/admin/roles/${role.key}`}
            className="flex h-full flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-brand-600"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
                {ICONS[role.key] ?? "🎭"}
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-ink">{role.name}</span>
                {role.description && <span className="text-sm text-slate-600">{role.description}</span>}
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-1.5 text-xs font-bold">
              {role.isLocked ? (
                <span className="rounded-full bg-brand-700 px-2.5 py-1 text-white">🔒 Locked</span>
              ) : role.isSystem ? (
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-brand-800">Built-in</span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">Added by you</span>
              )}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                👥 {role.peopleCount} {role.peopleCount === 1 ? "person" : "people"}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                ✅ {role.isLocked ? PERMISSIONS.length : role.permissionCount} of {PERMISSIONS.length} permissions
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
