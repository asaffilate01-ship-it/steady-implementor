import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";
import { legalConfig } from "@/lib/legal-config";

export const Route = createFileRoute("/legal/imprint")({
  head: () => ({
    meta: [
      { title: "Imprint — ParkPunkt" },
      { name: "description", content: "Legal provider disclosure for ParkPunkt." },
      { property: "og:title", content: "Imprint — ParkPunkt" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/legal/imprint" },
    ],
    links: [{ rel: "canonical", href: "/legal/imprint" }],
  }),
  component: ImprintPage,
});

function ImprintPage() {
  return (
    <LegalLayout title="Imprint" updated="1 August 2026">
      <p>Provider information according to § 5 DDG.</p>
      <h2>Operator</h2>
      <p>
        {legalConfig.companyName}
        <br />
        {legalConfig.street}
        <br />
        {legalConfig.city}
        <br />
        {legalConfig.country}
      </p>
      <h2>Represented by</h2>
      <p>{legalConfig.managingDirectors}</p>
      <h2>Contact</h2>
      <p>Email: {legalConfig.contactEmail}</p>
      <h2>Register entry</h2>
      <p>
        {legalConfig.registerCourt}, {legalConfig.registerNumber}
      </p>
      <h2>VAT</h2>
      <p>VAT ID according to § 27a UStG: {legalConfig.vatId}</p>
      <h2>Responsible for content</h2>
      <p>{legalConfig.companyName}, address as above.</p>
      <h2>Consumer dispute resolution</h2>
      <p>{legalConfig.adrStatement}</p>
    </LegalLayout>
  );
}
