import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

// bcrypt only looks at the first 72 bytes, so longer passwords are refused
// instead of being silently cut short.
const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((v) => Buffer.byteLength(v) <= 72, "Password is too long (72 characters at most)");

export const registerSchema = z
  .object({ email, password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
  returnTo: z.string().max(500).optional(),
});

export const codeSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const emailOnlySchema = z.object({ email });

export const resetSchema = z
  .object({ token: z.string().min(20).max(200), password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
