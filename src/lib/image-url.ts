// Which image links an admin may save.
//
// The storefront shows pictures with next/image, which refuses any host that
// isn't listed in next.config.ts and then crashes the page. So the admin may
// only save a link the storefront can actually load:
//   - a file in this project's public folder, e.g. /products/dress.jpg
//   - a picture in our own R2 bucket (the address in R2_PUBLIC_URL)
// Anything else (a link copied from another website) is refused up front.

export const IMAGE_LINK_ERROR =
  "Use the Upload button, or a path like /products/dress.jpg. Links from other websites can't be shown on the store.";

export function isAllowedImageUrl(value: string): boolean {
  // A file in the public folder.
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");

  // A picture in our own R2 bucket.
  if (!value.startsWith("https://")) return false;
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return false;
  try {
    const url = new URL(value);
    const root = new URL(base);
    const prefix = root.pathname.replace(/\/+$/, "") + "/";
    return url.origin === root.origin && url.pathname.startsWith(prefix) && url.pathname.length > prefix.length;
  } catch {
    return false;
  }
}
