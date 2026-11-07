import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/server/auth/actor";
import { listPossibleGuardians } from "@/server/services/people.service";
import { listRoles } from "@/server/services/roles.service";
import { NewPersonForm } from "./new-person-form";

export default function NewPersonPage() {
  return (
    <>
      <Link href="/admin/people" className="text-sm font-bold text-brand-700 underline">
        ← People
      </Link>
      <h1 className="text-2xl font-extrabold text-ink">Add a person</h1>
      <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
        <NewPerson />
      </Suspense>
    </>
  );
}

async function NewPerson() {
  const actor = await requirePermission("people:manage");
  const [guardians, roles] = await Promise.all([listPossibleGuardians(actor), listRoles(actor)]);

  return (
    <NewPersonForm
      guardians={guardians}
      // Pupils get the Student role automatically; adults choose from the rest.
      roles={roles.filter((role) => role.key !== "student").map(({ key, name, description }) => ({ key, name, description }))}
      defaultExamYear={nextPleYear()}
    />
  );
}

// The PLE is sat in July. Before then, pupils joining are in this year's P6.
function nextPleYear(): number {
  const now = new Date();
  return now.getMonth() < 6 ? now.getFullYear() : now.getFullYear() + 1;
}
