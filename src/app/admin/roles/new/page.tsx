import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/server/auth/actor";
import { NewRoleForm } from "../role-forms";

export default function NewRolePage() {
  return (
    <>
      <Link href="/admin/roles" className="text-sm font-bold text-brand-700 underline">
        ← Roles
      </Link>
      <h1 className="text-2xl font-extrabold text-ink">New role</h1>
      <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
        <NewRole />
      </Suspense>
    </>
  );
}

async function NewRole() {
  await requirePermission("roles:manage");
  return <NewRoleForm />;
}
