"use client";

import { createContext, useContext, type ReactNode } from "react";
import { FALLBACK_THEME, type StoreTheme } from "@/lib/theme";

const ThemeContext = createContext<{ theme: StoreTheme }>({ theme: FALLBACK_THEME });

// The theme is chosen on the server (see server/theme.ts) and handed down here,
// so the first page load already has the right colors: no flash of the default look.
export function ThemeProvider({ theme, children }: { theme: StoreTheme; children: ReactNode }) {
  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}

// Same shape as your Base44 hook: const { theme } = useTheme()
export const useTheme = () => useContext(ThemeContext);
