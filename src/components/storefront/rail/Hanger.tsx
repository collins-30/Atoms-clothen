import { useId } from "react";

/**
 * A thin chrome wire hanger, drawn in code so every garment hangs from the
 * same one. The hook's top sits at the very top of the SVG (that's where it
 * meets the rail); the shoulder bar sits behind the garment's collar.
 * viewBox 0 0 120 64: hook from y=0 to ~30, shoulders at y≈58.
 */
export default function Hanger({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const id = `hanger-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 120 64" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d9d6" />
          <stop offset="0.5" stopColor="#8f8f8b" />
          <stop offset="1" stopColor="#b8b8b4" />
        </linearGradient>
      </defs>
      {/* hook, curling over the rail */}
      <path d="M60 34 L60 24 C60 18 55.5 15.5 55.5 9.5 C55.5 4 59 1.6 62.5 1.6 C66.5 1.6 69 4.5 68.4 8" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" strokeLinecap="round" />
      {/* shoulders + bar */}
      <path d="M60 33 L13 55.5 C9 57.5 10.5 60.5 14 60.5 L106 60.5 C109.5 60.5 111 57.5 107 55.5 Z" fill="none" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="60" cy="33.5" r="2.4" fill="#9c9c98" />
    </svg>
  );
}
