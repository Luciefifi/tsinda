import { PERMISSIONS, type PermissionKey } from "@/server/auth/permissions";

// Permissions grouped by the part of Tsinda they unlock ("people:manage" is
// in the "people" area), for the tick boxes on the roles screen.

const AREAS: Record<string, { title: string; icon: string }> = {
  people: { title: "People", icon: "👥" },
  roles: { title: "Roles", icon: "🎭" },
  progress: { title: "Progress", icon: "📈" },
  schedule: { title: "Study schedule", icon: "📅" },
  content: { title: "Lessons and questions", icon: "📚" },
  study: { title: "Studying", icon: "🎒" },
};

export type PermissionGroup = {
  area: string;
  title: string;
  icon: string;
  permissions: { key: PermissionKey; description: string }[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = Object.entries(AREAS)
  .map(([area, look]) => ({
    area,
    ...look,
    permissions: PERMISSIONS.filter((p) => p.key.startsWith(`${area}:`)).map(({ key, description }) => ({ key, description })),
  }))
  .filter((group) => group.permissions.length > 0);

// A permission whose area is missing above would never be shown, so a test
// checks that every permission belongs to a group.
export const GROUPED_KEYS = new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.key)));
