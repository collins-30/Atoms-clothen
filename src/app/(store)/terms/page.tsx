import type { Metadata } from "next";
import LegalDocument from "@/components/storefront/LegalDocument";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return <LegalDocument doc="terms" />;
}
