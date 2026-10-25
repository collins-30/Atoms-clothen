import { z } from "zod";

// NOTE: no prices here on purpose. The browser says WHAT is in the cart
// (product, color, size, qty); the server looks up the real prices itself.
export const checkoutSchema = z.object({
  marketCode: z.string().trim().min(1).max(10),
  items: z
    .array(
      z.object({
        productSlug: z.string().trim().min(1).max(200),
        color: z.string().trim().min(1).max(80),
        size: z.string().trim().min(1).max(40),
        qty: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Your bag is empty")
    .max(50),
  customer: z.object({ email: z.string().trim().email("Enter a valid email") }),
  shippingAddress: z.object({
    fullName: z.string().trim().min(1, "Full name is required").max(120),
    phone: z.string().trim().max(40).optional(),
    line1: z.string().trim().min(1, "Address is required").max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1, "City is required").max(100),
    region: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().min(1, "Postal code is required").max(20),
    country: z.string().trim().min(1, "Country is required").max(100),
  }),
  delivery: z.enum(["standard", "express"]),
  discountCode: z.string().trim().max(40).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
