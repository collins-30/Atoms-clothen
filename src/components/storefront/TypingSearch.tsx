"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { getSearchSuggestions } from "@/server/search-suggestions";

// Loaded once per visit and shared by every search box on the page.
let suggestionsPromise: Promise<string[]> | null = null;
const loadSuggestions = () => (suggestionsPromise ??= getSearchSuggestions().catch(() => []));

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Types each word out, holds it, deletes it, moves to the next. */
function useTypewriter(words: string[], running: boolean) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!running || words.length === 0) return;
    let word = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const w = words[word];
      let delay: number;
      if (!deleting) {
        chars += 1;
        if (chars >= w.length) {
          deleting = true;
          delay = 1700;
        } else delay = 85;
      } else {
        chars -= 1;
        if (chars <= 0) {
          deleting = false;
          word = (word + 1) % words.length;
          delay = 380;
        } else delay = 40;
      }
      setText(w.slice(0, chars));
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [running, words]);

  return text;
}

/**
 * A search box whose placeholder types out "Try searching for… <category>",
 * cycling through the store's real category names. The animation stops for
 * good as soon as the visitor types; with reduced motion it shows one name
 * without animating.
 */
export default function TypingSearch({
  initialQuery = "",
  autoFocus = false,
  onDone,
  onClose,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  /** Called after a search is submitted (e.g. to close the header search). */
  onDone?: () => void;
  /** Shows a close (X) button that calls this. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [userTyped, setUserTyped] = useState(initialQuery !== "");
  const [words, setWords] = useState<string[]>([]);
  const [still] = useState(prefersReducedMotion);

  useEffect(() => {
    let alive = true;
    void loadSuggestions().then((w) => {
      if (alive) setWords(w);
    });
    return () => {
      alive = false;
    };
  }, []);

  const animating = !userTyped && q === "" && words.length > 0;
  const typed = useTypewriter(words, animating && !still);
  const shown = still ? (words[0] ?? "") : typed;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/shop?q=${encodeURIComponent(term)}`);
    onDone?.();
  };

  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-3 border-b border-stone-300 focus-within:border-foreground py-2.5 transition-colors">
      <Search className="w-4 h-4 text-stone-400 shrink-0" aria-hidden="true" />
      <div className="relative flex-1 min-w-0">
        <input
          type="search"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setUserTyped(true);
          }}
          aria-label="Search products and categories"
          placeholder={animating ? "" : "Search for products, categories…"}
          className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-stone-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {animating && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center text-sm text-stone-500 whitespace-nowrap overflow-hidden">
            Try searching for…&nbsp;<span className="text-foreground">{shown}</span>
            {!still && <span className="typing-caret" />}
          </span>
        )}
      </div>
      {q && (
        <button type="button" onClick={() => setQ("")} className="text-[10px] tracking-[0.15em] uppercase text-stone-500 hover:text-foreground">
          Clear
        </button>
      )}
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close search">
          <X className="w-4 h-4 text-stone-400" />
        </button>
      )}
    </form>
  );
}
