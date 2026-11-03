"use client";

import { useLayoutEffect, useRef } from "react";
import { themeCss, type StoreTheme } from "@/lib/theme";

// Writes the active theme's colours onto the whole page (see themeCss). Put one of
// these in every layout that should follow the theme: storefront, account, admin.
// The CSS is built only from validated hex colours, so it is safe to inject.
//
// Why this is a client component: when you move between pages (store <-> admin),
// Next.js keeps the page you left in the DOM, hidden, so going back is instant. A
// theme <style> is global, so the hidden page's old copy would keep applying and
// override the new theme until a hard refresh. So each copy switches itself off
// while its page is hidden (React runs this cleanup when it hides a page) and back
// on when the page is shown again.
export default function ThemeStyle({ theme }: { theme: StoreTheme }) {
  const css = themeCss(theme);
  const ref = useRef<HTMLStyleElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.media = "all";
    return () => {
      el.media = "not all"; // a stylesheet with a media query that never matches does nothing
    };
  }, [css]);

  if (!css) return null;
  return <style ref={ref} dangerouslySetInnerHTML={{ __html: css }} />;
}
