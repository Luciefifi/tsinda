// The single source of truth for roles and permissions.
// The seed script syncs these into the database. Code checks permissions
// by key, so a typo in a key is a type error.

export const ADMIN_ROLE = "admin";

export const SYSTEM_ROLES = [
  {
    key: ADMIN_ROLE,
    name: "Admin",
    description: "Manages people, roles, content and settings.",
  },
  {
    key: "student",
    name: "Student",
    description: "Studies lessons and takes checks and mock exams.",
  },
  {
    key: "guardian",
    name: "Guardian",
    description: "Follows their own children's progress and gets reminders.",
  },
  {
    key: "reviewer",
    name: "Reviewer",
    description: "Writes and reviews lessons, questions and answers.",
  },
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLES)[number]["key"];

type PermissionDefinition = {
  key: `${string}:${string}`;
  description: string;
  // Roles that get this permission when the role or the permission is
  // first created. Admin always gets every permission.
  defaultRoles: readonly Exclude<SystemRoleKey, typeof ADMIN_ROLE>[];
};

export const PERMISSIONS = [
  {
    key: "people:manage",
    description: "Add people and assign their roles.",
    defaultRoles: [],
  },
  {
    key: "roles:manage",
    description: "Create roles and change their permissions.",
    defaultRoles: [],
  },
  {
    key: "progress:view-any",
    description: "See any student's progress.",
    defaultRoles: [],
  },
  {
    key: "progress:view-own-children",
    description: "See the progress of students they are a guardian of.",
    defaultRoles: ["guardian"],
  },
  {
    key: "progress:view-self",
    description: "See their own progress.",
    defaultRoles: ["student"],
  },
  {
    key: "schedule:manage",
    description: "Change any student's study schedule and reminders.",
    defaultRoles: [],
  },
  {
    key: "schedule:manage-own-children",
    description: "Change the schedule of students they are a guardian of.",
    defaultRoles: ["guardian"],
  },
  {
    key: "content:edit",
    description: "Write and edit lessons and questions.",
    defaultRoles: ["reviewer"],
  },
  {
    key: "content:review",
    description: "Approve lessons and questions before students see them.",
    defaultRoles: ["reviewer"],
  },
  {
    key: "study:take-sessions",
    description: "Take lessons, checks and mock exams.",
    defaultRoles: ["student"],
  },
] as const satisfies readonly PermissionDefinition[];

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
