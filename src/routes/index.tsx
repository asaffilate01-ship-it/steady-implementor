import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { Car, Building2, Boxes, Camera, Shield, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParkPunkt — Finden. Parken. Bezahlen." },
      { name: "description", content: "The parking platform for drivers, operators, providers and cities. Search, book, pay — end to end." },
      { property: "og:title", content: "ParkPunkt — Finden. Parken. Bezahlen." },
      { property: "og:description", content: "Search, book, pay — end to end parking orchestration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const PORTALS = [
  { to: "/driver", icon: Car, title: "Driver", desc: "Find nearby parking, book a session, pay contactless." },
  { to: "/operator", icon: Building2, title: "Operator", desc: "Manage sites, tariffs and live occupancy." },
  { to: "/provider", icon: Boxes, title: "Provider Hub", desc: "Inventory feed and orchestration API sandbox." },
  { to: "/enforcement", icon: Camera, title: "Enforcement", desc: "ANPR plate checks and notice issuance." },
  { to: "/admin", icon: Shield, title: "Admin", desc: "Platform-wide oversight of operators and revenue." },
] as const;

function Home() {
  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src={logoAsset.url} alt="ParkPunkt" className="h-16 w-auto" />
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Finden. Parken. Bezahlen.</h1>
          <p className="max-w-2xl text-muted-foreground">One live platform across the parking value chain. Pick a portal to try the working flows — data is shared across all of them.</p>
          <div className="flex gap-2">
            <Button asChild size="lg"><Link to="/driver">Try Driver app <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link to="/operator">Operator dashboard</Link></Button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTALS.map((p) => (
            <Link key={p.to} to={p.to} className="group">
              <Card className="h-full transition hover:shadow-[var(--shadow-soft)] group-hover:border-primary/50">
                <CardContent className="space-y-2 p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><p.icon className="h-5 w-5"/></div>
                  <div className="flex items-center justify-between"><div className="text-lg font-semibold">{p.title}</div><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5"/></div>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}