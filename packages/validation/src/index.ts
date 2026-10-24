import { z } from "zod";

export const localeSchema = z.enum(["en", "hi", "ar", "es", "fr", "de", "pt"]);
export const signUpSchema = z.object({ email: z.string().email(), password: z.string().min(12).max(128), name: z.string().min(1).max(120) });
export const loginSchema = signUpSchema.pick({ email: true, password: true });
export const businessSchema = z.object({ name: z.string().min(2).max(160), countryCode: z.string().length(2), currency: z.string().length(3), timeZone: z.string().min(1), locale: localeSchema });
export const locationSchema = z.object({ name: z.string().min(2).max(160), address: z.string().max(500).optional(), timeZone: z.string().min(1) });
export const inviteSchema = z.object({ email: z.string().email(), role: z.enum(["manager", "shift_lead", "staff"]), locationIds: z.array(z.string().uuid()).min(1) });
