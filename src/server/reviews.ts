"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Replaces base44.entities.ProductReview.filter / .create and the "has this
// customer received the product?" check that Base44 did in the browser.
// Here every rule is enforced on the server, so it can't be skipped.

export type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  customerName: string | null;
  createdAt: string; // ISO date
};

export type ReviewsData = {
  reviews: ReviewItem[];
  average: number;
  count: number;
  viewer: {
    signedIn: boolean;
    /** Has a DELIVERED order that contains this product. */
    canReview: boolean;
    hasReviewed: boolean;
  };
};

export type ReviewsResult = { ok: true; data: ReviewsData } | { ok: false; error: string };
export type SubmitReviewResult = { ok: true } | { ok: false; error: string };

const reviewSchema = z.object({
  slug: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z
    .string()
    .trim()
    .min(1, "Please write a few words about the product.")
    .max(2000, "Please keep your review under 2,000 characters."),
});

// "Ada Lovelace" -> "Ada L."  (full names are not shown publicly)
function publicName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Verified customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Finds a delivered order of this user that contains the product (by slug). */
async function findDeliveredOrderId(userId: string, slug: string): Promise<string | null> {
  const item = await prisma.orderItem.findFirst({
    where: { slug, order: { userId, status: "DELIVERED" } },
    select: { orderId: true },
    orderBy: { order: { createdAt: "desc" } },
  });
  return item?.orderId ?? null;
}

export async function getProductReviews(slug: unknown): Promise<ReviewsResult> {
  if (typeof slug !== "string" || !slug || slug.length > 200) return { ok: false, error: "Product not found" };

  const product = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Product not found" };

  const [rows, stats, session] = await Promise.all([
    prisma.productReview.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, rating: true, title: true, body: true, customerName: true, createdAt: true },
    }),
    prisma.productReview.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    auth(),
  ]);

  const userId = session?.user?.id;
  let canReview = false;
  let hasReviewed = false;
  if (userId) {
    const [orderId, mine] = await Promise.all([
      findDeliveredOrderId(userId, slug),
      prisma.productReview.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
        select: { id: true },
      }),
    ]);
    canReview = orderId !== null;
    hasReviewed = mine !== null;
  }

  return {
    ok: true,
    data: {
      reviews: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      average: stats._avg.rating ?? 0,
      count: stats._count._all,
      viewer: { signedIn: Boolean(userId), canReview, hasReviewed },
    },
  };
}

export async function submitReview(raw: unknown): Promise<SubmitReviewResult> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your review." };
  const { slug, rating, title, body } = parsed.data;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Please sign in to leave a review." };

  const product = await prisma.product.findFirst({ where: { slug, status: "PUBLISHED" }, select: { id: true } });
  if (!product) return { ok: false, error: "Product not found" };

  const orderId = await findDeliveredOrderId(userId, slug);
  if (!orderId) return { ok: false, error: "Only customers who received this product can review it." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  try {
    await prisma.productReview.create({
      data: {
        productId: product.id,
        userId,
        orderId,
        rating,
        title: title || null,
        body,
        customerName: publicName(user?.name),
      },
    });
  } catch (e) {
    // @@unique([userId, productId]): a second review for the same product.
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false, error: "You have already reviewed this product." };
    }
    console.error("[reviews] create failed:", e);
    return { ok: false, error: "Could not save your review. Please try again." };
  }
  return { ok: true };
}
