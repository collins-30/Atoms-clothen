import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials login only works with JWT sessions, so we use them everywhere.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // Safe to link by email: Google only reports verified addresses, and password
    // accounts here must verify their email before they can log in.
    Google({ allowDangerousEmailAccountLinking: true }), // reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash || !user.emailVerified) return null; // unverified emails can't log in
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = (token.role as Role | undefined) ?? "USER";
      return session;
    },
  },
});

/**
 * Use this at the top of every admin server action / route handler.
 * It checks the role in the DATABASE (not just the cookie), so demoting an
 * admin takes effect immediately.
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
  return id;
}
