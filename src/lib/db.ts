import { PrismaClient } from "@prisma/client";

// Reuse one client in dev so hot-reload doesn't open a new connection each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
