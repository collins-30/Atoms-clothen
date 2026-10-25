import { Check } from "lucide-react";

const STEPS = ["Customer", "Shipping", "Delivery", "Payment", "Review"];

// Simple version. If you prefer your Base44 CheckoutSteps, port it over this
// one: it only needs the `current` prop (1 to 5).
export default function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 md:gap-4 overflow-x-auto">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2 md:gap-4 shrink-0">
            <span
              className={`w-6 h-6 rounded-full text-xs flex items-center justify-center border ${
                done
                  ? "bg-foreground text-background border-foreground"
                  : active
                    ? "border-foreground text-foreground"
                    : "border-stone-300 text-stone-400"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : n}
            </span>
            <span
              className={`text-xs tracking-[0.15em] uppercase ${active ? "text-foreground" : "text-stone-400"}`}
            >
              {label}
            </span>
            {n < STEPS.length && <span className="w-4 md:w-8 h-px bg-stone-300" />}
          </li>
        );
      })}
    </ol>
  );
}
