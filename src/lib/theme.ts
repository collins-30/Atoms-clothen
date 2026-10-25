// Pure theme helpers (safe on server and client). No database access here.
import type { CSSProperties } from "react";

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

function rgb(hex: string): [number, number, number] {
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Black or white, whichever is easier to read on top of `hex`. */
export function readableOn(hex: string): string {
  if (!isHex(hex)) return "#ffffff";
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#1a1a1a" : "#ffffff";
}

/**
 * CSS variables that re-colour the whole storefront. They are set on the store
 * wrapper only, so the admin area and login pages keep the default look.
 * Invalid or missing colors are skipped (the page keeps its normal color).
 */
export function themeVars(theme: StoreTheme): CSSProperties {
  const vars: Record<string, string> = {};
  const set = (name: string, value: string | null) => {
    if (isHex(value)) vars[name] = value.trim();
  };
  set("--background", theme.colorBackground);
  set("--foreground", theme.colorText);
  set("--secondary", theme.colorSecondary);
  set("--secondary-foreground", theme.colorText);
  const primary = isHex(theme.colorButton) ? theme.colorButton : theme.colorPrimary;
  set("--primary", primary);
  if (isHex(primary)) vars["--primary-foreground"] = readableOn(primary);
  return vars as CSSProperties;
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
