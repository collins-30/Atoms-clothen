"use client";

import type { CSSProperties } from "react";
import type { DecorationKind } from "@/lib/theme";

// A simple, lightweight version: gentle falling shapes, no images, no timers.
// (Your original ThemeDecorations.jsx wasn't included. Send it and I'll port it
// over this one.) Positions come from a formula, not Math.random, so the server
// and browser draw exactly the same thing.
const GLYPH: Record<DecorationKind, string[]> = {
  snow: ["❄", "❅", "❆"],
  hearts: ["♥"],
  sparkles: ["✦", "✧"],
  confetti: ["■", "▲", "●"],
};
const CONFETTI_COLORS = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#ffd166"];
const PER_KIND = 14;

export default function ThemeDecorations({ kinds }: { kinds: DecorationKind[] }) {
  if (!kinds.length) return null;

  const particles = kinds.flatMap((kind) =>
    Array.from({ length: PER_KIND }, (_, i) => {
      const glyphs = GLYPH[kind];
      return {
        key: `${kind}-${i}`,
        glyph: glyphs[i % glyphs.length],
        style: {
          left: `${(i * 37 + kind.length * 11) % 100}%`,
          fontSize: `${10 + ((i * 5) % 12)}px`,
          opacity: 0.35 + ((i * 7) % 5) / 10,
          animationDuration: `${9 + ((i * 13) % 8)}s`,
          animationDelay: `-${(i * 0.9) % 9}s`,
          color: kind === "confetti" ? CONFETTI_COLORS[i % CONFETTI_COLORS.length] : kind === "hearts" ? "#c4526a" : "currentColor",
        } as CSSProperties,
      };
    }),
  );

  return (
    <div aria-hidden="true" className="atl-deco-layer pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <style>{`
        @keyframes atl-fall { from { transform: translateY(-8vh) rotate(0deg); } to { transform: translateY(108vh) rotate(360deg); } }
        .atl-deco { position: absolute; top: 0; animation: atl-fall linear infinite; }
        @media (prefers-reduced-motion: reduce) { .atl-deco-layer { display: none; } }
      `}</style>
      {particles.map((p) => (
        <span key={p.key} className="atl-deco" style={p.style}>{p.glyph}</span>
      ))}
    </div>
  );
}
