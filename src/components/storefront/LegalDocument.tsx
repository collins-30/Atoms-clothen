import Link from "next/link";
import { LEGAL } from "@/lib/legal-content";

export default function LegalDocument({ doc }: { doc: keyof typeof LEGAL }) {
  const { title, updated, sections } = LEGAL[doc];
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>{title}</h1>
      <p className="mt-3 text-xs text-muted-foreground">{updated}</p>

      <div className="mt-12 space-y-10">
        {sections.map(([heading, text]) => (
          // id = first word of the heading, so /privacy#cookies jumps to "Cookies".
          <section key={heading} id={heading.toLowerCase().split(" ")[0]} className="scroll-mt-28">
            <h2 className="text-lg font-semibold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>{heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </section>
        ))}
      </div>

      <div className="mt-16 pt-8 border-t border-border">
        <Link href="/help#contact" className="text-xs tracking-[0.2em] uppercase hover:opacity-60">Questions? Contact us →</Link>
      </div>
    </div>
  );
}
