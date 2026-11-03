// Small shared pieces for the admin forms (no hooks, so server and client files can both use them).

export const inputCls =
  "h-10 w-full px-3 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-foreground disabled:opacity-50";
export const labelCls = "block text-[10px] tracking-[0.15em] uppercase text-stone-500 mb-1.5";
export const primaryBtn =
  "h-10 px-8 bg-primary text-primary-foreground hover:bg-primary/85 text-xs tracking-[0.15em] uppercase disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors";
export const ghostBtn =
  "h-10 px-6 text-xs tracking-[0.15em] uppercase text-stone-600 hover:text-foreground inline-flex items-center justify-center";

export type Notice = { tone: "ok" | "error"; text: string } | null;

export function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role="status"
      className={`text-sm px-4 py-3 border ${
        notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
    >
      {notice.text}
    </p>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 border border-stone-100 animate-pulse" />
      ))}
    </div>
  );
}
