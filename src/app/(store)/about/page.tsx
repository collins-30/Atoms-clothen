import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Company",
  description: "Who we are, what we stand for, and where to find us.",
};

// Links like /about#careers jump straight to a section: Next scrolls to the id.
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Company</h1>
      <p className="mt-3 text-sm text-muted-foreground">Who we are, what we stand for, and where to find us.</p>

      <div className="mt-12 space-y-12">
        <Section id="about" title="About">
          <p>Atelier was founded on a simple idea: fewer, better things. We design and curate a tightly edited collection of apparel for men and women — pieces made from natural and responsibly sourced materials, in a palette that outlasts any season.</p>
          <p>Every garment is produced in small runs by partners we know personally, and each is built to be worn, washed and kept for years. We don&apos;t chase trends; we refine a wardrobe.</p>
        </Section>

        <Section id="sustainability" title="Sustainability">
          <p>We work exclusively with mills and workshops that meet recognised environmental and labour standards, favouring organic cotton, linen, and recycled fibres. Patterns are cut to minimise fabric waste, and leftover materials are returned to our mills for reprocessing.</p>
          <p>All packaging is plastic-free, recyclable, and printed with plant-based inks. We ship carbon-neutral on every route, and we publish a yearly impact summary covering materials, emissions and factory conditions.</p>
        </Section>

        <Section id="careers" title="Careers">
          <p>We are a small, international team across design, production, digital and customer care. We hire slowly, for curiosity and craft, and we invest in the people who join us.</p>
          <p>Open roles are listed on our LinkedIn page as they become available, and we welcome speculative applications at any time — tell us what you&apos;d bring to Atelier. All positions are remote-friendly with quarterly team gatherings.</p>
        </Section>

        <Section id="stores" title="Stores">
          <p>Our first permanent stores are in New York and Copenhagen, both conceived as calm spaces to try the collection in person, with same-day tailoring appointments.</p>
          <p>Opening hours: Monday–Saturday, 10:00–19:00. Private appointments can be arranged through the contact page. Selected pieces are also carried by a small number of partner boutiques worldwide.</p>
        </Section>
      </div>

      <div className="mt-16 pt-8 border-t border-border">
        <Link href="/shop" className="text-xs tracking-[0.2em] uppercase hover:opacity-60">Shop the collection →</Link>
      </div>
    </div>
  );
}
