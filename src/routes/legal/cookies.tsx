import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";
import { ManageCookiesButton } from "@/lib/cookies";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — ParkPunkt" },
      { name: "description", content: "Cookies used by ParkPunkt, their purpose, duration and how to manage them." },
      { property: "og:title", content: "Cookie Policy — ParkPunkt" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/legal/cookies" },
    ],
    links: [{ rel: "canonical", href: "/legal/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="25 July 2026">
      <p>ParkPunkt uses a small number of cookies and equivalent browser storage. This page explains which ones, why, and how to change your choice.</p>
      <h2>Categories</h2>
      <ul>
        <li><strong>Strictly necessary</strong> — sign-in session, language, security tokens, your cookie consent state. Cannot be disabled.</li>
        <li><strong>Analytics</strong> — aggregated usage data so we can improve the product. Off by default, requires consent.</li>
        <li><strong>Marketing</strong> — measure campaign effectiveness on partner platforms. Off by default, requires consent.</li>
      </ul>
      <h2>Cookies we set</h2>
      <ul>
        <li><code>pp.cookies.v1</code> — your consent choice (180 days).</li>
        <li><code>sb-*-auth-token</code> — authentication session (managed by our auth provider).</li>
        <li><code>pp.lang</code> — language preference (stored in localStorage).</li>
        <li><code>_ga</code>, <code>_gid</code> — analytics (only if you consented).</li>
      </ul>
      <h2>Managing your choice</h2>
      <p>You can change your consent at any time:</p>
      <p><ManageCookiesButton className="rounded-full border border-border/70 bg-secondary/40 px-3 py-1.5 text-sm text-foreground/90 hover:bg-secondary" /></p>
      <p>You can also delete cookies via your browser settings; you'll be asked to make a choice again next time you visit.</p>
    </LegalLayout>
  );
}