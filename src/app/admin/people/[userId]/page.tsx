import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { relationshipLabel } from "@/lib/relationships";
import { requirePermission } from "@/server/auth/actor";
import { getPerson, listActivity, listPossibleGuardians } from "@/server/services/people.service";
import { listRoles } from "@/server/services/roles.service";
import { ActionButton } from "../../action-button";
import { ActivityList } from "../../activity-list";
import { setActiveAction, unlinkGuardianAction, unlockAction } from "../actions";
import { Initials, KindBadge, RoleChips, StatusBadges } from "../person-badges";
import { DetailsForm, LinkGuardianForm, ResetSecretForm, RolesForm } from "./person-forms";

export default function PersonPage({ params, searchParams }: PageProps<"/admin/people/[userId]">) {
  return (
    <>
      <Link href="/admin/people" className="text-sm font-bold text-brand-700 underline">
        ← People
      </Link>
      <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
        <Person params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Person({ params, searchParams }: Pick<PageProps<"/admin/people/[userId]">, "params" | "searchParams">) {
  const actor = await requirePermission("people:manage");
  const { userId } = await params;
  if (!z.uuid().safeParse(userId).success) notFound();

  const person = await getPerson(actor, userId);
  if (!person) notFound();
  const justAdded = (await searchParams).added === "1";
  const isMe = person.id === actor.userId;

  const [history, roles, possibleGuardians] = await Promise.all([
    listActivity(actor, { targetUserId: person.id, limit: 20 }),
    person.kind === "adult" ? listRoles(actor) : Promise.resolve([]),
    person.kind === "pupil" ? listPossibleGuardians(actor) : Promise.resolve([]),
  ]);
  const linkedIds = new Set(person.guardians.map((g) => g.id));

  return (
    <>
      {justAdded && (
        <p role="status" className="rounded-2xl bg-green-50 px-5 py-4 font-medium text-green-800 ring-1 ring-green-200">
          ✅ {person.fullName} was added.{" "}
          {person.kind === "pupil"
            ? `Give them their username (${person.username}) and PIN.`
            : "Tell them their phone number and temporary password. They will choose their own when they log in."}
        </p>
      )}

      <header className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <Initials name={person.fullName} kind={person.kind} size="lg" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-ink">
            {person.fullName} {isMe && <span className="text-base font-bold text-slate-500">(you)</span>}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            <KindBadge kind={person.kind} />
            <StatusBadges person={person} />
            {person.kind === "adult" && <RoleChips roles={person.roles} />}
          </div>
          <p className="text-sm text-slate-600">
            {person.kind === "pupil" ? `Username: ${person.username}` : formatPhone(person.phone)} · Added{" "}
            {formatDate(person.createdAt)} ·{" "}
            {person.lastLoginAt ? `Last login ${formatDateTime(person.lastLoginAt)}` : "Has never logged in"}
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card title="✏️ Details">
            <DetailsForm
              person={{
                id: person.id,
                kind: person.kind,
                fullName: person.fullName,
                phone: formatPhone(person.phone),
                username: person.username ?? "",
                examYear: person.examYear,
                school: person.school ?? "",
              }}
            />
          </Card>

          {person.kind === "adult" ? (
            <>
              <Card title="🎭 Roles" text="What this person can do in Tsinda. Changes apply at once.">
                <RolesForm
                  userId={person.id}
                  roles={roles
                    .filter((role) => role.key !== "student")
                    .map(({ key, name, description }) => ({ key, name, description }))}
                  current={person.roles.map((role) => role.key)}
                />
              </Card>
              <Card title="🎒 Pupils they look after">
                {person.pupils.length === 0 ? (
                  <p className="text-slate-500">None. Link pupils from the pupil&apos;s page.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100">
                    {person.pupils.map((pupil) => (
                      <li key={pupil.id} className="flex justify-between gap-3 py-2">
                        <Link href={`/admin/people/${pupil.id}`} className="font-bold text-brand-700 underline">
                          {pupil.fullName}
                        </Link>
                        <span className="text-slate-600">{relationshipLabel(pupil.relationship)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          ) : (
            <Card title="👪 Who looks after this pupil" text="They follow the pupil's progress and get reminders.">
              {person.guardians.length === 0 ? (
                <p className="text-slate-500">Nobody yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {person.guardians.map((guardian) => (
                    <li
                      key={guardian.id}
                      className="flex flex-col gap-3 rounded-2xl bg-brand-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col">
                        <Link href={`/admin/people/${guardian.id}`} className="font-bold text-brand-700 underline">
                          {guardian.fullName}
                        </Link>
                        <span className="text-sm text-slate-600">
                          {relationshipLabel(guardian.relationship)} · {formatPhone(guardian.contact)}
                        </span>
                      </div>
                      <div className="sm:w-36">
                        <ActionButton
                          action={unlinkGuardianAction}
                          fields={{ userId: person.id, guardianId: guardian.id }}
                          label="Remove"
                          pendingLabel="Removing..."
                          variant="danger"
                          confirm={`Remove ${guardian.fullName} as a guardian of ${person.fullName}?`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <LinkGuardianForm
                userId={person.id}
                adults={possibleGuardians
                  .filter((adult) => !linkedIds.has(adult.id))
                  .map((adult) => ({ id: adult.id, label: `${adult.fullName} (${formatPhone(adult.phone)})` }))}
              />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card
            title="🔐 Account safety"
            text={
              person.kind === "pupil"
                ? "If the pupil forgot their PIN, set a new one and tell their parent."
                : "If they forgot their password, set a temporary one. They choose their own at the next login."
            }
          >
            <ResetSecretForm userId={person.id} kind={person.kind} />

            {person.isLocked && person.lockedUntil && (
              <div className="flex flex-col gap-2 rounded-2xl bg-red-50 p-4">
                <p className="font-medium text-red-800">
                  🔒 Locked after too many wrong tries, until {formatDateTime(person.lockedUntil)}.
                </p>
                <ActionButton action={unlockAction} fields={{ userId: person.id }} label="🔓 Unlock now" pendingLabel="Unlocking..." />
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
              {person.isActive ? (
                isMe ? (
                  <p className="text-sm text-slate-500">You can&apos;t turn off your own account.</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Turning the account off logs them out everywhere and stops them logging in. Nothing is deleted.
                    </p>
                    <ActionButton
                      action={setActiveAction}
                      fields={{ userId: person.id, active: "false" }}
                      label="⏸️ Turn the account off"
                      pendingLabel="Turning off..."
                      variant="danger"
                      confirm={`Turn off ${person.fullName}'s account? They will be logged out.`}
                    />
                  </>
                )
              ) : (
                <>
                  <p className="text-sm text-slate-600">This account is turned off. Turn it on to let them log in again.</p>
                  <ActionButton
                    action={setActiveAction}
                    fields={{ userId: person.id, active: "true" }}
                    label="▶️ Turn the account on"
                    pendingLabel="Turning on..."
                    variant="primary"
                  />
                </>
              )}
            </div>
          </Card>

          <Card title="🕘 History" text="Every change made to this person.">
            <ActivityList entries={history} empty="No changes recorded yet." />
          </Card>
        </div>
      </div>
    </>
  );
}

function Card({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-xl font-extrabold text-ink">{title}</h2>
        {text && <p className="text-sm text-slate-600">{text}</p>}
      </div>
      {children}
    </section>
  );
}
