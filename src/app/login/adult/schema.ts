import { z } from "zod";
import { normalizeRwandaPhone } from "@/lib/phone";

// What the adult login form must contain. The phone number is tidied into
// the "+250..." form the database uses.
export const adultLoginSchema = z.object({
  phone: z.string().transform((value, ctx) => {
    const phone = normalizeRwandaPhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Please write your phone number, for example 0788 123 456." });
      return z.NEVER;
    }
    return phone;
  }),
  password: z.string().min(1, "Please write your password."),
});
