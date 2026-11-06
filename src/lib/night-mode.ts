"use client";

// The shop page's Night Mode switch. The choice is remembered in this browser
// (a convenience only: if storage is blocked it simply starts off again).

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

const KEY = "jamas-night-mode";
const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** [isOn, setOn] for the Night Mode switch (always off during server rendering). */
export function useNightModeSetting(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, () => (cached ??= read()), () => false);
  const set = useCallback((next: boolean) => {
    cached = next;
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // storage blocked (private window etc.): still works for this visit
    }
    listeners.forEach((l) => l());
  }, []);
  return [on, set];
}

/**
 * `on`: cards show their night shot (or a dimmed photo).
 * `changed`: the visitor has flipped the switch at least once on this page, so
 * cards may animate the change (prevents a fade on first load).
 */
export const NightModeContext = createContext<{ on: boolean; changed: boolean }>({ on: false, changed: false });
export const useNightMode = () => useContext(NightModeContext);
