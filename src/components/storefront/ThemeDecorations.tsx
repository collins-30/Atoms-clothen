"use client";

import type { CSSProperties } from "react";
import type { DecorationKind } from "@/lib/theme";

// Ported from your Base44 ThemeDecorations.jsx. Positions come from a formula
// (no Math.random), so the server and the browser draw the same thing.
// The `theme-fall` keyframes live in src/app/JAMAS.css.
const KINDS: Record<DecorationKind, { glyph: string; colors: string[]; count: number }> = {
  snow: { glyph: "❅", colors: ["#AFC6DB"], count: 12 },
  hearts: { glyph: "♥", colors: ["#D98C99", "#C4526A"], count: 8 },
  sparkles: { glyph: "✦", colors: ["#C9A227", "#9DB8D2"], count: 10 },
  confetti: { glyph: "●", colors: ["#E4572E", "#F3A712", "#32936F", "#5C80BC"], count: 14 },
};

export default function ThemeDecorations({ kinds = [] }: { kinds?: DecorationKind[] }) {
  const items = kinds.flatMap((kind) => {
    const cfg = KINDS[kind];
    if (!cfg) return [];
    return Array.from({ length: cfg.count }, (_, i) => ({ cfg, i }));
  });
  if (!items.length) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] overflow-hidden motion-reduce:hidden">
      {items.map(({ cfg, i }, idx) => (
        <span
          key={idx}
          className="absolute top-0 text-sm"
          style={
            {
              left: `${(idx * 97) % 100}%`,
              color: cfg.colors[i % cfg.colors.length],
              animation: `theme-fall ${8 + (i % 6) * 2}s linear -${((i * 1.7) % 12).toFixed(1)}s infinite`,
            } as CSSProperties
          }
        >
          {cfg.glyph}
        </span>
      ))}
    </div>
  );
}
