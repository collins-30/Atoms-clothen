import Image from "next/image";
import Hanger from "@/components/storefront/rail/Hanger";
import { DEFAULT_HANG, type Hang } from "@/lib/media";

// The hanger SVG is 120 units wide; its bar spans ~100 of them and sits at y≈58.
const BAR_UNITS = 100;
const BAR_Y = 58;

/** How far below the hook's top the garment image starts, as a fraction of the garment's width. */
export function garmentTop(hang: Hang): number {
  const barY = (BAR_Y / BAR_UNITS) * hang.w; // bar height below the hook top
  // Line the garment's shoulder line up with the bar; keep at least a bit of hook showing.
  return Math.max(barY - hang.y, 0.14 * hang.w);
}

/** Total height of a hung garment (hook top to hem), as a fraction of its width. */
export const hungHeight = (aspect: number, hang: Hang) => garmentTop(hang) + aspect;

/**
 * A rail cut-out on its hanger. The hanger is sized and placed from the
 * image's measured neckline and shoulders (`hang`), so the hook comes out of
 * the collar and the bar sits inside the shoulders. Fills its parent's width;
 * the top edge is the top of the hook (where it meets the rail).
 */
export default function HungGarment({
  src,
  aspect,
  hang,
  alt = "",
  sizes,
  priority = false,
  plain = false,
  imgClassName = "",
}: {
  src: string;
  aspect: number;
  hang: Hang | null;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  /** Use a plain <img> (admin previews of images not uploaded yet). */
  plain?: boolean;
  imgClassName?: string;
}) {
  const h = hang ?? DEFAULT_HANG;
  const hangerW = h.w * (120 / BAR_UNITS); // hanger width as a fraction of the garment width
  return (
    <span className="relative block w-full" style={{ paddingTop: `${(garmentTop(h) * 100).toFixed(3)}%` }}>
      <Hanger className="absolute top-0 block" style={{ left: `${((h.x - hangerW / 2) * 100).toFixed(3)}%`, width: `${(hangerW * 100).toFixed(3)}%` }} />
      {plain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={`rail-cutout relative block w-full h-auto select-none ${imgClassName}`} draggable={false} />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={720}
          height={Math.round(720 * aspect)}
          sizes={sizes}
          priority={priority}
          draggable={false}
          className={`rail-cutout relative block w-full h-auto select-none ${imgClassName}`}
        />
      )}
    </span>
  );
}
