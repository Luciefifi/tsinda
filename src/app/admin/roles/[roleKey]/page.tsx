import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requirePermission } from "@/server/auth/actor";
import { listActivity } from "@/server/services/people.service";
import { getRole } from "@/server/services/roles.service";
import { ActionButton } from "../../action-button";
import { ActivityList } from "../../activity-list";
import { deleteRoleAction } from "../actions";
import { PermissionBoxes, RoleDetailsForm, RolePermissionsForm } from "../role-forms";

export default function RolePage({ params }: PageProps<"/admin/roles/[roleKey]">) {
  return (
    <>
      <Link href="/admin/roles" className="text-sm font-bold text-brand-700 underline">
        ← Roles
      </Link>
      <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
        <Role params={params} />
      </Suspense>
    </>
  );
}

async function Role({ params }: { params: PageProps<"/admin/roles/[roleKey]">["params"] }) {
  const actor = await requirePermission("roles:manage");
  const { roleKey } = await params;
  const role = await getRole(actor, roleKey);
  if (!role) notFound();
  const history = await listActivity(actor, { targetRoleId: role.id, limit: 10 });

  return (
    <>
      <header className="flex flex-col gap-2 rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white shadow-lg shadow-brand-700/30">
        <p className="self-start rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
          {role.isLocked ? "🔒 Locked role" : role.isSystem ? "Built-in role" : "Role added by you"}
        </p>
        <h1 className="text-3xl font-extrabold">{role.name}</h1>
        {role.description && <p className="text-brand-100">{role.description}</p>}
      </header>

      {role.isLocked ? (
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <p className="rounded-2xl bg-brand-50 p-4 font-medium text-brand-800">
            🔒 Admins can always do everything, so this role can&apos;t be changed. This keeps someone able to
            manage Tsinda.
          </p>
          <PermissionBoxes checked={[]} locked />
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-extrabold text-ink">✏️ Name</h2>
            <RoleDetailsForm role={{ key: role.key, name: role.name, description: role.description ?? "" }} />
          </section>
          <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-xl font-extrabold text-ink">✅ What can people with this role do?</h2>
              <p className="text-sm text-slate-600">Changes apply at once to everyone with this role.</p>
            </div>
            <RolePermissionsForm roleKey={role.key} current={role.permissionKeys} />
          </section>
        </>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-extrabold text-ink">👥 People with this role ({role.peopleCount})</h2>
          {role.people.length === 0 ? (
            <p className="text-slate-500">Nobody has this role.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {role.people.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/admin/people/${person.id}`}
                    className="inline-flex rounded-full bg-brand-50 px-3 py-1.5 font-bold text-brand-800 hover:bg-brand-100"
                  >
                    {person.fullName}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!role.isSystem && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
              {role.peopleCount > 0 ? (
                <p className="text-sm text-slate-600">To delete this role, first remove it from everyone above.</p>
              ) : (
                <ActionButton
                  action={deleteRoleAction}
                  fields={{ key: role.key }}
                  label="🗑️ Delete this role"
                  pendingLabel="Deleting..."
                  variant="danger"
                  confirm={`Delete the role "${role.name}"?`}
                />
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 text-xl font-extrabold text-ink">🕘 History</h2>
          <ActivityList entries={history} empty="No changes recorded yet." />
        </section>
      </div>
    </>
  );
}
