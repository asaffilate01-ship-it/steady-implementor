import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/legal/imprint")({
  head: () => ({
    meta: [
      { title: "Imprint — ParkPunkt" },
      { name: "description", content: "Legal disclosure per § 5 TMG for ParkPunkt GmbH." },
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
    <LegalLayout title="Imprint" updated="25 July 2026">
      <p>Information according to § 5 TMG.</p>
      <h2>Operator</h2>
      <p>
        ParkPunkt GmbH<br />
        Alexanderplatz 1<br />
        10178 Berlin<br />
        Germany
      </p>
      <h2>Represented by</h2>
      <p>The Managing Directors of ParkPunkt GmbH.</p>
      <h2>Contact</h2>
      <p>Email: hello@parkpunkt.example</p>
      <h2>Register entry</h2>
      <p>Amtsgericht Berlin (Charlottenburg), HRB — to be filled at registration.</p>
      <h2>VAT</h2>
      <p>VAT ID according to § 27a UStG — to be filled at registration.</p>
      <h2>Responsible for content</h2>
      <p>ParkPunkt GmbH, address as above.</p>
      <h2>EU dispute resolution</h2>
      <p>The European Commission provides a platform for online dispute resolution: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>.</p>
    </LegalLayout>
  );
}