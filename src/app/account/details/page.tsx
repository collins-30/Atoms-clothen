import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLACED_ORDERS, requireUserId } from "@/server/account-data";
import DetailsForm from "./DetailsForm";

export const metadata: Metadata = { title: "Personal details" };

export default async function DetailsPage() {
  const userId = await requireUserId("/account/details");

  const [user, addresses, lastOrder] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, dateOfBirth: true, emailMarketing: true },
    }),
    prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] }),
    // Sign-up only asks for an email and password, so a new account has no name or
    // phone yet. Offer the ones from their latest order (they press Save to keep them).
    prisma.order.findFirst({
      where: { userId, ...PLACED_ORDERS },
      orderBy: { createdAt: "desc" },
      select: { shipFullName: true, shipPhone: true },
    }),
  ]);
  if (!user) notFound();

  return (
    <DetailsForm
      profile={{
        name: user.name?.trim() || lastOrder?.shipFullName || "",
        email: user.email,
        phone: user.phone || lastOrder?.shipPhone || "",
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "",
        emailMarketing: user.emailMarketing,
      }}
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label ?? "",
        fullName: a.fullName,
        line1: a.line1,
        line2: a.line2 ?? "",
        city: a.city,
        postalCode: a.postalCode,
        country: a.country,
        phone: a.phone ?? "",
        isDefault: a.isDefault,
      }))}
    />
  );
}
