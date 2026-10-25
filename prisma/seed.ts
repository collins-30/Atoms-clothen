/**
 * Seed data. Run with:  npx prisma db seed
 * Safe to run again: everything is an upsert, so it updates instead of duplicating.
 *
 * REAL data (copied from your Base44 export): product names/slugs/SKUs/text,
 * colors, collections, image filenames, the four markets, themes, discounts.
 *
 * REAL from your price table: the US price of the 4 products you sent (bomber,
 * turtleneck, denim shirt; pleated trousers is not seeded yet) and the pattern
 * your other market prices follow (CA = US x 1.35, EU = US x 0.92, AF = US x 1550).
 * REAL stock/sizes pattern: S=20, M=8, L=30, XL=5 (seen on two products).
 *
 * PLACEHOLDERS (search for "PLACEHOLDER"): US prices of the other products,
 * shipping prices, category names, the homepage flags (new / bestseller / ...).
 */
import { PrismaClient, Gender, DiscountType, HeaderStyle, BannerType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ───────────── Markets ─────────────
// `rate` turns a US price into each market's price. These three rates are the
// pattern in your real price table (it reproduces all 12 prices you sent).
const MARKETS = [
  { code: "US", name: "United States", currency: "USD", currencySymbol: "$", displayOrder: 1, rate: 1, round: 1 },
  { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "C$", displayOrder: 2, rate: 1.35, round: 1 },
  { code: "EU", name: "Europe", currency: "EUR", currencySymbol: "€", displayOrder: 3, rate: 0.92, round: 1 },
  { code: "AF", name: "Africa", currency: "NGN", currencySymbol: "₦", displayOrder: 4, rate: 1550, round: 1 },
] as const;

// PLACEHOLDER shipping prices (USD 12 standard / 25 express, converted).
const SHIPPING_USD = { standard: 12, express: 25 };

// ───────────── Categories ─────────────
// PLACEHOLDER: only the categories your 9 products use. Add the rest.
const CATEGORIES = [
  { slug: "m-knitwear", name: "Knitwear", gender: Gender.MEN, displayOrder: 1 },
  { slug: "m-outerwear", name: "Outerwear", gender: Gender.MEN, displayOrder: 2 },
  { slug: "shirts", name: "Shirts", gender: Gender.MEN, displayOrder: 3 },
  { slug: "w-knitwear", name: "Knitwear", gender: Gender.WOMEN, displayOrder: 1 },
  { slug: "w-outerwear", name: "Outerwear", gender: Gender.WOMEN, displayOrder: 2 },
  { slug: "dresses", name: "Dresses", gender: Gender.WOMEN, displayOrder: 3 },
  { slug: "w-trousers", name: "Trousers", gender: Gender.WOMEN, displayOrder: 4 },
];

// ───────────── Products ─────────────
// Put the image files in  public/products/  (download them from Base44).
const SIZES = ["S", "M", "L", "XL"];
// Stock per size, from your variant table (bomber + turtleneck). Applied to
// every product as a starting point: edit real stock in the admin later.
const STOCK_BY_SIZE: Record<string, number> = { S: 20, M: 8, L: 30, XL: 5 };

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  gender: Gender;
  image: string;
  materials: string;
  care: string;
  collection: string;
  colors: { name: string; hex: string }[];
  usd: number; // US price. REAL for bomber/turtleneck/denim shirt, PLACEHOLDER for the rest
  isNew?: boolean; // PLACEHOLDER homepage flags
  isBestseller?: boolean;
  isTrending?: boolean;
  featured?: boolean;
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "oversized-hoodie",
    name: "Oversized Hoodie",
    description: "An oversized hoodie with a dropped shoulder, kangaroo pocket and double-lined hood.",
    sku: "ATL-MH006",
    category: "m-knitwear",
    gender: Gender.MEN,
    image: "71c36f86d_generated_cf703dce.jpg",
    materials: "100% organic cotton, 380gsm brushed fleece.",
    care: "Machine wash cold inside out. Tumble dry low.",
    collection: "Essentials",
    colors: [{ name: "Black", hex: "#1A1A1A" }, { name: "Grey", hex: "#8A8A86" }],
    usd: 95,
    isBestseller: true,
  },
  {
    slug: "relaxed-fit-denim-shirt",
    name: "Relaxed-Fit Denim Shirt",
    description: "A relaxed-fit denim shirt with a soft washed hand-feel and classic point collar.",
    sku: "ATL-MS007",
    category: "shirts",
    gender: Gender.MEN,
    image: "ec0c04ce1_generated_be4c1b20.jpg",
    materials: "100% organic cotton denim.",
    care: "Machine wash cold. Hang dry.",
    collection: "Essentials",
    colors: [{ name: "Light Blue", hex: "#9BB3C9" }, { name: "Black", hex: "#1A1A1A" }],
    usd: 90, // REAL (inferred: your CA/EU/AF prices for this shirt all match US 90)
    isNew: true,
  },
  {
    slug: "merino-wool-turtleneck",
    name: "Merino Wool Turtleneck",
    description: "A fine-gauge merino turtleneck with a close, layering-friendly fit and ribbed collar.",
    sku: "ATL-MK009",
    category: "m-knitwear",
    gender: Gender.MEN,
    image: "7bae756d8_generated_491580ae.jpg",
    materials: "100% extra-fine merino wool.",
    care: "Hand wash cold or wool cycle. Dry flat.",
    collection: "Winter Edit",
    colors: [{ name: "Navy", hex: "#2A3A55" }, { name: "Black", hex: "#1A1A1A" }],
    usd: 120, // REAL
    isTrending: true,
  },
  {
    slug: "leather-trimmed-bomber-jacket",
    name: "Leather-Trimmed Bomber Jacket",
    description: "A bomber jacket with ribbed cuffs and leather-trimmed placket, inspired by classic flight silhouettes.",
    sku: "ATL-MJ010",
    category: "m-outerwear",
    gender: Gender.MEN,
    image: "308abed07_generated_b000b98b.jpg",
    materials: "Cotton-nylon shell, leather trims. Polyester lining.",
    care: "Dry clean only.",
    collection: "Winter Edit",
    colors: [{ name: "Olive", hex: "#5A5A32" }, { name: "Black", hex: "#1A1A1A" }],
    usd: 240, // REAL
    featured: true,
  },
  {
    slug: "oversized-wool-blend-coat",
    name: "Oversized Wool Blend Coat",
    description:
      "An oversized single-breasted coat cut from a warm wool blend with a relaxed drop-shoulder silhouette and notched lapel.",
    sku: "ATL-WC001",
    category: "w-outerwear",
    gender: Gender.WOMEN,
    image: "aa394e9be_generated_be67a821.jpg",
    materials: "70% wool, 30% recycled polyester. Cupro lining.",
    care: "Dry clean only. Do not bleach.",
    collection: "Winter Edit",
    colors: [{ name: "Camel", hex: "#B89B6E" }, { name: "Black", hex: "#1A1A1A" }],
    usd: 420,
    featured: true,
    isNew: true,
  },
  {
    slug: "tailored-linen-blazer",
    name: "Tailored Linen Blazer",
    description: "A softly structured linen blazer with a single-button closure and natural drape for transitional weather.",
    sku: "ATL-WB002",
    category: "w-outerwear",
    gender: Gender.WOMEN,
    image: "f9b9f20b9_generated_f400c623.jpg",
    materials: "100% European linen.",
    care: "Dry clean or gentle cold wash. Iron on low.",
    collection: "Winter Edit",
    colors: [{ name: "Beige", hex: "#D8C9A8" }, { name: "Black", hex: "#1A1A1A" }],
    usd: 240,
  },
  {
    slug: "silk-slip-dress",
    name: "Silk Slip Dress",
    description: "A bias-cut slip dress in fluid silk with adjustable straps and a cowl neckline.",
    sku: "ATL-SD003",
    category: "dresses",
    gender: Gender.WOMEN,
    image: "7f3ecd511_generated_69c10f12.jpg",
    materials: "100% mulberry silk.",
    care: "Dry clean or hand wash cold. Do not tumble dry.",
    collection: "Essentials",
    colors: [{ name: "Black", hex: "#1A1A1A" }, { name: "Ivory", hex: "#F3ECE0" }],
    usd: 290,
    isBestseller: true,
    isTrending: true,
  },
  {
    slug: "high-waist-wide-leg-trousers",
    name: "High-Waist Wide-Leg Trousers",
    description: "High-waisted wide-leg trousers with a pressed crease and fluid drape through the leg.",
    sku: "ATL-WT004",
    category: "w-trousers",
    gender: Gender.WOMEN,
    image: "05b066575_generated_6c8a1f2c.jpg",
    materials: "98% cotton, 2% elastane.",
    care: "Machine wash cold. Hang dry.",
    collection: "Essentials",
    colors: [{ name: "Cream", hex: "#ECE6D8" }, { name: "Black", hex: "#1A1A1A" }],
    usd: 160,
    isBestseller: true,
  },
  {
    slug: "cashmere-knit-sweater",
    name: "Cashmere Knit Sweater",
    description: "A relaxed crew-neck sweater in pure cashmere with ribbed trims and a soft, warm hand-feel.",
    sku: "ATL-WK005",
    category: "w-knitwear",
    gender: Gender.WOMEN,
    image: "7c7cc0b87_generated_03528435.jpg",
    materials: "100% grade-A Mongolian cashmere.",
    care: "Hand wash cold with cashmere shampoo. Dry flat.",
    collection: "Winter Edit",
    colors: [{ name: "Grey", hex: "#8A8A86" }, { name: "Camel", hex: "#B89B6E" }],
    usd: 340,
    featured: true,
    isTrending: true,
  },
];

// ───────────── Themes ─────────────
// Dates are "MM-DD" and repeat every year. Decorations are a PLACEHOLDER guess.
const THEMES = [
  {
    name: "Default", slug: "default", autoActivate: false, startDate: null, endDate: null,
    colorPrimary: "#1A1A1A", colorSecondary: "#F0EFEB", colorBackground: "#F9F9F7", colorText: "#1A1A1A", colorButton: "#1A1A1A",
    announcementEnabled: false, announcementText: null, decorations: [], displayOrder: 0,
  },
  {
    name: "Christmas", slug: "christmas", autoActivate: true, startDate: "12-01", endDate: "12-31",
    colorPrimary: "#9E1B1B", colorSecondary: "#E9E0CC", colorBackground: "#F7F2E7", colorText: "#1F3D2B", colorButton: "#9E1B1B",
    announcementEnabled: true, announcementText: "Merry Christmas — complimentary gift wrapping on every order",
    decorations: ["snow"], displayOrder: 1,
  },
  {
    name: "Valentine's", slug: "valentines", autoActivate: true, startDate: "02-07", endDate: "02-14",
    colorPrimary: "#C4526A", colorSecondary: "#F3D9DE", colorBackground: "#FCF1F3", colorText: "#5A1F2E", colorButton: "#C4526A",
    announcementEnabled: true, announcementText: "The Valentine's edit — gift wrapping on every order",
    decorations: ["hearts"], displayOrder: 2,
  },
  {
    name: "Easter", slug: "easter", autoActivate: true, startDate: "04-10", endDate: "04-20",
    colorPrimary: "#A7C4A0", colorSecondary: "#ECE8D8", colorBackground: "#FAF7EC", colorText: "#4A4436", colorButton: "#A7C4A0",
    announcementEnabled: false, announcementText: null, decorations: ["sparkles"], displayOrder: 3,
  },
  {
    name: "Summer", slug: "summer", autoActivate: true, startDate: "06-01", endDate: "08-31",
    colorPrimary: "#E8842C", colorSecondary: "#E3EDE6", colorBackground: "#FBF8EF", colorText: "#1E3A4C", colorButton: "#E8842C",
    announcementEnabled: false, announcementText: null, decorations: [], displayOrder: 4,
  },
  {
    name: "Black Friday", slug: "black-friday", autoActivate: true, startDate: "11-24", endDate: "11-30",
    colorPrimary: "#FFC53D", colorSecondary: "#1E1E1E", colorBackground: "#0D0D0D", colorText: "#F2F2F2", colorButton: "#FFC53D",
    announcementEnabled: true, announcementText: "Black Friday — up to 40% off sitewide",
    decorations: ["confetti"], displayOrder: 5,
  },
];

// ───────────── Banners ─────────────
// Type wasn't in your paste: assumed HERO (it's your only banner). The image
// file goes in public/banners/ (download it from Base44).
const BANNERS = [
  {
    type: BannerType.HERO,
    title: "Batman",
    subtitle: "winter fits",
    image: "/banners/7a1b2b9de_2.jpg",
    buttonText: "shop with Atom",
    link: "https://bbb-webinar.vercel.app/",
    displayOrder: 1,
  },
];

// ───────────── Discounts ─────────────
// Discount type wasn't in your paste. PLACEHOLDER: both assumed to be percent.
const DISCOUNTS = [
  { code: "WELCOME10", type: DiscountType.PERCENT, value: 10, minOrder: 0, startDate: null, endDate: null },
  {
    code: "ATOMSTHENAME", type: DiscountType.PERCENT, value: 30, minOrder: 100,
    startDate: new Date("2026-10-16T00:00:00Z"), endDate: new Date("2026-12-16T23:59:59Z"),
  },
];

// ───────────── helpers ─────────────
const priceFor = (usd: number, m: (typeof MARKETS)[number]) =>
  (Math.round((usd * m.rate) / m.round) * m.round).toFixed(2);

const colorCode = (name: string) => name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

async function main() {
  // Markets + shipping options
  for (const m of MARKETS) {
    const market = await prisma.market.upsert({
      where: { code: m.code },
      update: { name: m.name, currency: m.currency, currencySymbol: m.currencySymbol, displayOrder: m.displayOrder },
      create: { code: m.code, name: m.name, currency: m.currency, currencySymbol: m.currencySymbol, displayOrder: m.displayOrder },
    });
    for (const method of ["standard", "express"] as const) {
      const price = priceFor(SHIPPING_USD[method], m);
      await prisma.shippingOption.upsert({
        where: { marketId_code: { marketId: market.id, code: method } },
        update: { price },
        create: { marketId: market.id, code: method, price },
      });
    }
  }

  // Categories
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, gender: c.gender, displayOrder: c.displayOrder },
      create: c,
    });
  }

  // Products, variants, market prices
  const markets = await prisma.market.findMany();
  for (const p of PRODUCTS) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });
    const data = {
      name: p.name,
      description: p.description,
      sku: p.sku,
      categoryId: category.id,
      gender: p.gender,
      images: [`/products/${p.image}`],
      materials: p.materials,
      care: p.care,
      collection: p.collection,
      colors: p.colors,
      sizes: SIZES,
      tags: [],
      isNew: p.isNew ?? false,
      isBestseller: p.isBestseller ?? false,
      isTrending: p.isTrending ?? false,
      featured: p.featured ?? false,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, status: "PUBLISHED", ...data },
    });

    for (const color of p.colors) {
      for (const size of SIZES) {
        const sku = `${p.sku}-${colorCode(color.name)}-${size}`;
        await prisma.productVariant.upsert({
          where: { sku },
          // `update` leaves stock alone so re-seeding doesn't reset real stock
          update: { colorHex: color.hex },
          create: { productId: product.id, color: color.name, colorHex: color.hex, size, sku, stock: STOCK_BY_SIZE[size] ?? 0 },
        });
      }
    }

    for (const m of markets) {
      const def = MARKETS.find((x) => x.code === m.code)!;
      const price = priceFor(p.usd, def);
      await prisma.productPrice.upsert({
        where: { productId_marketId: { productId: product.id, marketId: m.id } },
        update: {}, // keep any prices you've edited
        create: { productId: product.id, marketId: m.id, price, available: true },
      });
    }
  }

  // Themes
  for (const t of THEMES) {
    const { decorations, ...rest } = t;
    await prisma.theme.upsert({
      where: { slug: t.slug },
      update: { ...rest, decorations, headerStyle: HeaderStyle.DEFAULT },
      create: { ...rest, decorations, headerStyle: HeaderStyle.DEFAULT, active: true },
    });
  }
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", overrideTheme: "auto" },
  });

  // Discounts
  for (const d of DISCOUNTS) {
    await prisma.discount.upsert({
      where: { code: d.code },
      update: { type: d.type, value: d.value, minOrder: d.minOrder, startDate: d.startDate, endDate: d.endDate },
      create: { ...d, active: true },
    });
  }

  // Banners (matched by title so re-seeding doesn't duplicate them)
  for (const b of BANNERS) {
    const existing = await prisma.banner.findFirst({ where: { title: b.title } });
    if (existing) await prisma.banner.update({ where: { id: existing.id }, data: b });
    else await prisma.banner.create({ data: { ...b, active: true } });
  }

  // Admin user (set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create one)
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN", passwordHash },
      create: { email: adminEmail, name: "Admin", role: "ADMIN", passwordHash, emailVerified: new Date() },
    });
    console.log(`Admin user ready: ${adminEmail}`);
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin user created.");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
