// Removes test data before launch. Products, categories, banners, themes,
// markets, shipping options and store settings are NOT touched.
//
//   npm run db:clean-test            -> dry run: only shows what would be deleted
//   npm run db:clean-test -- --yes   -> actually deletes
//
// Deleted: all orders (and their items), all reviews, all non-admin accounts
// (with their addresses/sessions/linked logins), newsletter subscribers, pending
// verification codes and rate-limit counters, and the demo discount code.
// Kept: every account with the ADMIN role.
import { PrismaClient } from "@prisma/client";

const DEMO_CODES = ["ATOMSTHENAME"];

function dbHost(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}:${u.port || "3306"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL missing or invalid)";
  }
}

async function main() {
  const apply = process.argv.includes("--yes");
  console.log(`Database: ${dbHost()}`);
  console.log(apply ? "Mode: DELETE" : "Mode: dry run (add --yes to delete)");

  const prisma = new PrismaClient();
  try {
    const counts = {
      orders: await prisma.order.count(),
      reviews: await prisma.productReview.count(),
      customers: await prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      newsletter: await prisma.newsletterSubscriber.count(),
      authTokens: await prisma.authToken.count(),
      verificationTokens: await prisma.verificationToken.count(),
      rateLimits: await prisma.rateLimit.count(),
      demoDiscounts: await prisma.discount.count({ where: { code: { in: DEMO_CODES } } }),
    };
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
    console.table(counts);
    console.log(`Admins that will be kept: ${admins.map((a) => a.email).join(", ") || "none"}`);

    if (!apply) return;

    await prisma.$transaction([
      prisma.productReview.deleteMany(),
      prisma.order.deleteMany(), // items go with them (cascade)
      prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } }),
      prisma.newsletterSubscriber.deleteMany(),
      prisma.authToken.deleteMany(),
      prisma.verificationToken.deleteMany(),
      prisma.rateLimit.deleteMany(),
      prisma.discount.deleteMany({ where: { code: { in: DEMO_CODES } } }),
    ]);
    console.log("Done. Test data removed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
