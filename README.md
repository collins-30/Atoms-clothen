# JAMAS store

## Model videos (moving product cards and editorial videos)

Product cards, the product page and the home page's editorial section can show
**real video of a model wearing the product**: walking, turning, posing. The
store never fakes this with zoom or slide effects on photos. A product without
a model video simply shows its photos.

### What to film for each product

- 3–8 second clip of a model **wearing that exact item**: a walk towards the
  camera, a slow turn to show the back, a pose with some arm movement.
- Portrait framing (3:4 or 9:16), clean background, steady camera.
- Start and end in a similar pose so the loop is smooth.
- No sound is needed (videos always play muted).
- One clip per product to start; add more later as alternate videos.

### Prepare and upload

1. Compress the clip (needs [ffmpeg](https://ffmpeg.org/download.html)):
   `./scripts/optimize-video.sh my-clip.mov 6`
   This makes `my-clip-web.mp4` (silent H.264 MP4, max 1280 px, starts playing
   before it fully downloads) and `my-clip-poster.jpg`. Aim for under ~6 MB.
2. Admin › Products › edit the product › **Upload model video**. A poster frame
   is taken from the clip automatically ("Set poster" replaces it).
3. Use the arrows to set the display order of photos and videos.
4. **Shop card shows → Model video** to play it in the shop grid.
5. Tick **Feature this model video in the large editorial section** to show it
   full-width on the home page.

Uploads go to the same Cloudflare R2 bucket as photos (`products/videos/`).
MP4 and WebM are accepted, up to 60 MB; iPhone `.mov` files must be exported
as MP4 first (the script does this).

### How they play

Videos are muted, looped and inline (`playsInline`), load only when they come
near the screen, pause when scrolled away or when the tab is hidden, and only
the most visible few play at once (4 on desktop, 2 on phones). Visitors who
ask for reduced motion or use data saver see the poster instead. If a browser
blocks autoplay, the poster stays.

### Banner videos (Admin › Content)

Hero, promo and craftsmanship banners can have a video as well as (or instead
of) a photo: edit the banner › **Upload video**. If the banner has no image
yet, a still frame from the video is saved as its image; the image shows until
the video plays and for visitors with reduced motion / data saver.

### Night Mode (shop page)

The **Night mode** switch next to Sort fades every product card, through a soft
blur, to its *night shot*. Tick **Night shot** on a photo or video in Admin ›
Products (e.g. the same dress filmed in evening light or with flash). Products
without a night shot have their photo dimmed instead. The visitor's choice is
remembered in their browser.

### Search box

The search box types out "Try searching for… <category>", cycling through the
names of active categories that have published products. It stops as soon as
the visitor types.

### The clothing rail

Products can hang on a chrome clothing rail: on the home page ("The Rail",
one category at a time with tabs) and on the shop page with the **Grid / Rail**
switch (one rail per category, then everything without a rail image in the
grid below). Hover turns a garment to face you; click/tap opens a closer look
with Front/Back, colours, live sizes and Add to bag (same cart as the product
page). Sold-out pieces hang with a "Sold out" tag, worked out from live stock,
so it disappears as soon as they're restocked.

To put a product on the rail: Admin › Products › edit › **Clothing rail** ›
Upload a photo of the garment alone on a plain white or light background
(or a transparent PNG). The background is removed in the browser and the
result is previewed on the rail before saving; use the slider if background
is left or part of the garment disappears, and "Check on a dark background"
for white garments. Photos without a cast shadow give the cleanest result.
A back view is optional. Rail images don't appear in the product gallery,
cart, orders or emails, and product videos are unaffected.

### Database

Migrations `20261106090000_product_media`,
`20261106130000_banner_video_night_media` and `20261106150000_rack_images` only add a `ProductMedia` table and
columns with defaults (`Product.cardMedia`, `Product.editorial`,
`ProductMedia.night`, `ProductMedia.rack`, `ProductMedia.aspect`, `Banner.videoUrl`). Existing products keep
working unchanged: until a product is saved again, its media comes from its
`images` list. Run `npx prisma migrate deploy` on the production database.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
