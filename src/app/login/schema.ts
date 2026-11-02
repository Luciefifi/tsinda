import { z } from "zod";

// What the student login form must contain. Messages are shown to the child.
export const studentLoginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Please write your username."),
  pin: z.string().regex(/^\d{4}$/, "Your PIN is 4 numbers."),
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;
