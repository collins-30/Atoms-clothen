// Gives an existing account the ADMIN role.
//
//   npm run admin:make -- client@example.com
//
// The person must have registered (or signed in with Google) once first.
// Prints which database it talked to so you can see it is the right one.
import { PrismaClient } from "@prisma/client";

function dbHost(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}:${u.port || "3306"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL missing or invalid)";
  }
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:make -- someone@example.com");
    process.exit(1);
  }
  console.log(`Database: ${dbHost()}`);

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, name: true } });
    if (!user) {
      console.error(`No account found for ${email}. Ask them to register or sign in with Google first, then run this again.`);
      process.exit(1);
    }
    if (user.role === "ADMIN") {
      console.log(`${email} is already an admin. Nothing to do.`);
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log(`Done: ${email} (${user.name ?? "no name"}) is now an admin.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
