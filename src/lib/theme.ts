// Pure theme helpers (safe on server and client). No database access here.
import { DARK_HUE_SWAPS } from "./theme-hues";

export type DecorationKind = "snow" | "hearts" | "sparkles" | "confetti";
export const DECORATION_KINDS: DecorationKind[] = ["snow", "hearts", "sparkles", "confetti"];

export type StoreTheme = {
  slug: string;
  name: string;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorBackground: string | null;
  colorText: string | null;
  colorButton: string | null;
  headerStyle: "default" | "tinted" | "bordered";
  announcementEnabled: boolean;
  announcementText: string | null;
  bannerImage: string | null;
  bannerHeading: string | null;
  bannerSubheading: string | null;
  bannerLink: string | null;
  decorations: DecorationKind[];
};

/** Used when the database has no themes yet. Same colors as your "Default" theme. */
export const FALLBACK_THEME: StoreTheme = {
  slug: "default",
  name: "Default",
  colorPrimary: "#1A1A1A",
  colorSecondary: "#F0EFEB",
  colorBackground: "#F9F9F7",
  colorText: "#1A1A1A",
  colorButton: "#1A1A1A",
  headerStyle: "default",
  announcementEnabled: false,
  announcementText: null,
  bannerImage: null,
  bannerHeading: null,
  bannerSubheading: null,
  bannerLink: null,
  decorations: [],
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isHex = (v: string | null | undefined): v is string => !!v && HEX.test(v.trim());

// ───────────── colour maths ─────────────

/** "#abc" / "#AABBCC" -> "#aabbcc", or null when it isn't a hex colour. */
function norm(v: string | null | undefined): string | null {
  if (!isHex(v)) return null;
  let h = v.trim().slice(1).toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h}`;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = ([r, g, b]: [number, number, number]) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** `t` = 0 gives `a`, 1 gives `b`. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). Text needs at least 4.5. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Returns `fg`, nudged towards black or white only as far as needed so it reads
 * on every colour in `bgs` (contrast at least `min`).
 */
function ensureContrast(fg: string, bgs: string[], min: number): string {
  const worst = (c: string) => Math.min(...bgs.map((b) => contrast(c, b)));
  if (worst(fg) >= min) return fg;
  const target = worst("#000000") >= worst("#ffffff") ? "#000000" : "#ffffff";
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = mix(fg, target, t);
    if (worst(c) >= min) return c;
  }
  return target;
}

/** Dark text or white, whichever is easier to read on top of `hex` (the button / banner text colour). */
export function readableOn(hex: string): string {
  const bg = norm(hex);
  if (!bg) return "#ffffff";
  return contrast("#1a1a1a", bg) >= contrast("#ffffff", bg) ? "#1a1a1a" : "#ffffff";
}

const DEFAULT_BG = "#f9f9f7";
const DEFAULT_TEXT = "#1a1a1a";

/**
 * The CSS that re-colours the whole site (storefront, account pages and admin,
 * pop-up dialogs included) for one theme. It is written on :root, not on a
 * wrapper element, because dialogs and menus are drawn outside the wrapper.
 *
 * An admin can pick any five colours, so this does not trust them blindly:
 *  - the text colour is nudged until it reads on the background (contrast 4.5),
 *  - every other colour the site uses (cards, borders, greys, muted text, status
 *    colours) is worked out from the five, so nothing ends up dark-on-dark,
 *  - on a dark theme the light-to-dark greys and the green / red / amber status
 *    colours are flipped.
 * Only hex colours go in, so the result is safe to inject as a <style>.
 * Returns "" for the unchanged default look.
 */
export function themeCss(theme: StoreTheme): string {
  const bg = norm(theme.colorBackground) ?? DEFAULT_BG;
  const textRaw = norm(theme.colorText) ?? DEFAULT_TEXT;
  const secondaryRaw = norm(theme.colorSecondary);
  const buttonRaw = norm(theme.colorButton) ?? norm(theme.colorPrimary);

  const isDefault =
    bg === DEFAULT_BG &&
    textRaw === DEFAULT_TEXT &&
    (!secondaryRaw || secondaryRaw === "#f0efeb") &&
    (!buttonRaw || buttonRaw === DEFAULT_TEXT);
  if (isDefault) return "";

  // Hopeless text colour (say dark on dark): use black or white. Slightly weak: nudge it just enough.
  const text = contrast(textRaw, bg) < 3 ? readableOn(bg) : ensureContrast(textRaw, [bg], 4.5);
  const dark = luminance(bg) < 0.179; // white text would read better than black on this background
  const secondary = secondaryRaw ?? mix(bg, text, 0.06);
  const primary = buttonRaw ?? text;
  const card = dark ? mix(bg, "#ffffff", 0.06) : mix(bg, "#ffffff", 0.55);

  const vars: Record<string, string> = {
    "color-scheme": dark ? "dark" : "light", // dark scrollbars, date pickers, select lists
    "--background": bg,
    "--foreground": text,
    "--card": card,
    "--card-foreground": text,
    "--popover": card,
    "--popover-foreground": text,
    "--primary": primary,
    "--primary-foreground": readableOn(primary),
    "--secondary": secondary,
    "--secondary-foreground": ensureContrast(text, [secondary], 4.5),
    "--muted": secondary,
    "--muted-foreground": ensureContrast(mix(text, bg, 0.4), [bg, secondary, card], 4.5),
    "--border": mix(bg, text, 0.14),
    "--input": mix(bg, text, 0.22),
    "--ring": primary,
    "--success": dark ? "#7bd88f" : ensureContrast("#2d5a27", [bg], 4.5),
  };

  // Tailwind's greys (text-stone-500, border-stone-200, bg-stone-100 ...) run light to dark and
  // are used all over the site. Rebuild that ramp as "background colour to text colour", so a
  // dark theme still gets faint-to-strong greys and a coloured theme gets greys tinted to match.
  // Shades used for text are kept readable on the background; the faint ones are surfaces and lines.
  const steps: [string, number, number][] = [
    // shade, how far from background towards text, minimum contrast against the background
    ["50", 0.04, 1], ["100", 0.08, 1], ["200", 0.14, 1], ["300", 0.24, 1],
    ["400", 0.42, 3], ["500", 0.58, 4.5], ["600", 0.7, 4.5], ["700", 0.8, 4.5],
    ["800", 0.9, 4.5], ["900", 0.95, 4.5], ["950", 1, 4.5],
  ];
  for (const [shade, t, min] of steps) {
    const c = mix(bg, text, t);
    vars[`--color-stone-${shade}`] = min > 1 ? ensureContrast(c, [bg, card], min) : c;
  }
  // On a dark theme the green / red / amber status colours flip too, so a badge such as
  // bg-emerald-50 text-emerald-800 becomes a dark tint with light text.
  if (dark) Object.assign(vars, DARK_HUE_SWAPS);

  const body = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  // :root:root:root outranks the :root:root rule in atelier.css
  return `:root:root:root{${body}}`;
}

// ───────────── which theme is active today? ─────────────

const inRange = (md: string, start: string, end: string) =>
  start <= end ? md >= start && md <= end : md >= start || md <= end; // e.g. "12-20" to "01-05" wraps the new year

/** "MM-DD" for `now` in the store's time zone (set STORE_TIMEZONE, e.g. "Europe/Istanbul"; default UTC). */
export function monthDay(now: Date, timeZone = "UTC"): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, month: "2-digit", day: "2-digit" }).formatToParts(now);
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${m}-${d}`;
}

type Pickable = StoreTheme & {
  active: boolean;
  autoActivate: boolean;
  startDate: string | null;
  endDate: string | null;
};

/**
 * Same rules as your admin Appearance page:
 *  - a manual override (a theme slug) wins; "auto" restores schedule-based activation
 *  - otherwise the first active, auto-activate theme whose date range includes today
 *  - otherwise the "default" theme
 */
export function pickActiveTheme(themes: Pickable[], override: string, now: Date, timeZone = "UTC"): StoreTheme {
  if (override && override !== "auto") {
    const manual = themes.find((t) => t.slug === override);
    if (manual) return manual;
  }
  const md = monthDay(now, timeZone);
  const scheduled = themes.find(
    (t) => t.active && t.autoActivate && t.startDate && t.endDate && inRange(md, t.startDate, t.endDate),
  );
  if (scheduled) return scheduled;
  return themes.find((t) => t.slug === "default") ?? FALLBACK_THEME;
}
