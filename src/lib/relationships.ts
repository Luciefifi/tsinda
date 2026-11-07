// How a guardian is related to a pupil. The keys are stored in
// guardianships.relationship (a CHECK constraint allows only these).
export const RELATIONSHIPS = {
  parent: "Parent",
  grandparent: "Grandparent",
  aunt_uncle: "Aunt or uncle",
  sibling: "Brother or sister",
  teacher: "Teacher",
  other: "Other",
} as const;

export type Relationship = keyof typeof RELATIONSHIPS;

export const RELATIONSHIP_KEYS = Object.keys(RELATIONSHIPS) as [Relationship, ...Relationship[]];

export function relationshipLabel(key: string | null): string {
  return key && key in RELATIONSHIPS ? RELATIONSHIPS[key as Relationship] : "Guardian";
}
