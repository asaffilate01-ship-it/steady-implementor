import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import {
  MapPin,
  CreditCard,
  Car,
  Building2,
  Shield,
  Camera,
  Gauge,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Euro,
  Users,
  Zap,
  BarChart3,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParkPunkt — Finden. Parken. Bezahlen." },
      {
        name: "description",
        content:
          "ParkPunkt vereint Parkplatzsuche, Buchung und Bezahlung in einer App — mit ANPR, Tarif-Engine und Operator-Tools für die gesamte Parkraum-Wertschöpfungskette.",
      },
      { property: "og:title", content: "ParkPunkt — Finden. Parken. Bezahlen." },
      {
        property: "og:description",
        content:
          "Eine Plattform für Fahrer, Betreiber und Städte. Suchen, buchen, bezahlen — mit ANPR, Tarif-Engine und Enforcement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Stakeholders />
      <DriverFlow />
      <ProviderOrchestration />
      <ANPRSection />
      <PaymentRoutes />
      <OperatorSuite />
      <Enforcement />
      <Architecture />
      <SuperAdmin />
      <BuildOrder />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="ParkPunkt" className="h-9 w-auto" />
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#driver" className="hover:text-primary transition-colors">Fahrer-App</a>
          <a href="#operator" className="hover:text-primary transition-colors">Betreiber</a>
          <a href="#anpr" className="hover:text-primary transition-colors">ANPR</a>
          <a href="#architecture" className="hover:text-primary transition-colors">Architektur</a>
          <a href="#build" className="hover:text-primary transition-colors">Roadmap</a>
        </nav>
        <a
          href="#cta"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 transition-opacity"
          style={{ background: "var(--gradient-brand)" }}
        >
          Demo anfragen <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.08]"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div
        aria-hidden
        className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-30 -z-10"
        style={{ background: "var(--gradient-brand)" }}
      />
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-28 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Parking-Plattform der nächsten Generation
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            <span className="text-primary">Park</span>
            <span className="text-accent">Punkt.</span>
            <br />
            <span className="text-foreground/90">Finden. Parken. Bezahlen.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Eine Plattform, die Fahrer, Betreiber, Städte und Provider verbindet.
            Von der Kartensuche über ANPR-Einfahrt bis Abrechnung — nahtlos in
            einem Ökosystem.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#cta"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] hover:translate-y-[-1px] transition-transform"
              style={{ background: "var(--gradient-brand)" }}
            >
              Parkplatz finden <MapPin className="h-4 w-4" />
            </a>
            <a
              href="#operator"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-primary hover:bg-secondary transition-colors"
            >
              Für Betreiber <Building2 className="h-4 w-4" />
            </a>
          </div>
          <dl className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
            {[
              { k: "3", v: "Sekunden bis Session" },
              { k: "128+", v: "Plätze pro Site" },
              { k: "24/7", v: "Zugang & Support" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="text-2xl font-bold text-primary">{s.k}</dt>
                <dd className="text-xs text-muted-foreground mt-1">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <PhoneMockup />
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto">
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[3rem] blur-3xl opacity-40"
        style={{ background: "var(--gradient-brand)" }}
      />
      <div
        className="relative rounded-[2.5rem] border-8 border-primary/90 bg-card p-4 w-[320px] mx-auto"
        style={{ boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="rounded-[1.75rem] bg-secondary/40 overflow-hidden">
          <div className="p-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-accent" />
              GPS
            </div>
          </div>
          <div className="px-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Aktive Session</div>
            <div className="mt-1 text-lg font-semibold text-primary">City Center Parking</div>
            <div className="text-xs text-muted-foreground">Level 2 • Slot B-14</div>
          </div>
          <div className="mx-4 mt-4 rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Verbraucht</span>
              <Clock className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="mt-1 text-3xl font-bold text-primary">€3.20</div>
            <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-[42%] rounded-full" style={{ background: "var(--gradient-brand)" }} />
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">01:24 / 03:00 gebucht</div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            <button className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold py-2.5">
              Verlängern
            </button>
            <button className="rounded-xl border border-border bg-card text-primary text-xs font-semibold py-2.5">
              Beenden
            </button>
          </div>
          <div className="mx-4 mb-4 rounded-2xl border border-border bg-secondary/40 p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
              <Car className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-primary">B-MW 1234</div>
              <div className="text-[10px] text-muted-foreground">ANPR verifiziert</div>
            </div>
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs uppercase tracking-[0.2em] font-semibold text-accent">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-primary">
        {title}
      </h2>
      {desc && <p className="mt-4 text-muted-foreground leading-relaxed">{desc}</p>}
    </div>
  );
}

function Stakeholders() {
  const items = [
    { icon: Car, title: "Fahrer", desc: "Suchen, buchen und bezahlen in einer App — mit ANPR-Einfahrt und automatischer Abrechnung." },
    { icon: Building2, title: "Betreiber", desc: "Setup, Tarife, Belegung, Zahlungen und Enforcement — komplett aus einer Konsole." },
    { icon: MapPin, title: "Städte", desc: "Straßenparken, Sonderzonen und Enforcement — Compliance und Transparenz eingebaut." },
    { icon: Layers, title: "Provider", desc: "White-Label-Integration, Webhooks und Marketplace-Orchestrierung." },
  ];
  return (
    <section className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="02 · Stakeholder"
          title="Eine Plattform. Vier Rollen."
          desc="ParkPunkt verbindet alle Akteure der Parkraum-Wertschöpfungskette in einem gemeinsamen Datenraum."
        />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it) => (
            <div
              key={it.title}
              className="group rounded-2xl border border-border bg-card p-6 hover:shadow-[var(--shadow-soft)] transition-shadow"
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                <it.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold text-primary">{it.title}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DriverFlow() {
  const steps = [
    { n: "3.1", title: "Erststart", desc: "Onboarding mit Sprache, Standort, Benachrichtigungen." },
    { n: "3.2", title: "Registrierung", desc: "E-Mail, Telefon oder SSO — Identität optional." },
    { n: "3.3", title: "Fahrzeug hinzufügen", desc: "Kennzeichen, Land, Typ — verknüpft mit ANPR." },
    { n: "3.4", title: "Home-Screen", desc: "Karte, aktive Session, Schnellzugriff." },
    { n: "4",   title: "Parkplatz-Suche", desc: "Standort, Filter, Verfügbarkeit in Echtzeit." },
    { n: "5",   title: "Provider-Auswahl", desc: "Ranking nach Preis, Nähe, Bewertung." },
    { n: "6",   title: "Session starten", desc: "Fahrzeug wählen, Tarif prüfen, bestätigen." },
    { n: "10",  title: "Bezahlung", desc: "Karte, SEPA, Wallet — automatische Belege." },
  ];
  return (
    <section id="driver" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="03 · Fahrer-App"
          title="Der komplette Fahrer-Lifecycle"
          desc="Vom ersten Öffnen bis zur letzten Rechnung — jeder Schritt orchestriert."
        />
        <ol className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="relative rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-mono text-accent tracking-wider">
                  §{s.n}
                </div>
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</div>
              </div>
              <div className="mt-3 font-semibold text-primary">{s.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ProviderOrchestration() {
  return (
    <section className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <SectionHeader
            eyebrow="05 · Orchestrierung"
            title="Provider-Auswahl in Millisekunden"
            desc="Der Orchestrator fragt alle verfügbaren Provider im Zielgebiet ab, filtert nach Kriterien und rankt das beste Match — dann wird die Session gestartet, bezahlt und dokumentiert."
          />
          <ul className="mt-8 space-y-3">
            {[
              "User-Input: Standort, Dauer, Preis-Range",
              "Provider-Query über einheitliche API",
              "Filterung nach Verfügbarkeit & Kriterien",
              "Ranking nach Preis · Nähe · Rating",
              "Auswahl & Bestätigung",
              "Session-Orchestrierung inkl. Payment",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-foreground/80">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="rounded-2xl border border-border bg-primary text-primary-foreground p-6 font-mono text-xs leading-relaxed overflow-x-auto"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <div className="text-accent">// provider ranking response</div>
          <pre className="mt-3 text-primary-foreground/90">{`{
  "provider_id": "P001",
  "name": "City Center Parking",
  "location": "Downtown",
  "price_per_hour": 5.00,
  "total_price": 25.00,
  "available_spots": 10,
  "rating": 4.5,
  "distance_km": 0.5,
  "duration_hours": 5,
  "payment_methods": ["credit_card", "cash"],
  "features": ["valet", "covered"]
}`}</pre>
        </div>
      </div>
    </section>
  );
}

function ANPRSection() {
  return (
    <section id="anpr" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="09 · ANPR & Schranken"
          title="Barrierefreie Einfahrt via Kennzeichen"
          desc="Kamera erkennt Kennzeichen, prüft Session, öffnet Schranke — ohne Ticket, ohne App-Interaktion."
        />
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { icon: Camera, t: "Kennzeichen erkannt", d: "Kamera-Trigger an Ein-/Ausfahrt, OCR mit >99% Genauigkeit." },
            { icon: Zap, t: "Session-Match", d: "Abgleich mit aktiven Buchungen in <200 ms via Edge-Cache." },
            { icon: Shield, t: "Schranke öffnet", d: "Sichere Signal-Payload, Audit-Trail, Fallback auf QR." },
          ].map((it) => (
            <div key={it.t} className="rounded-2xl border border-border bg-card p-6">
              <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold text-primary">{it.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{it.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PaymentRoutes() {
  return (
    <section className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="10 · Payment"
          title="Zwei Transaktions-Routen"
          desc="ParkPunkt trennt Discovery und Abwicklung, wo es Sinn ergibt — und übernimmt die volle Kette, wo es Mehrwert schafft."
        />
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">A</div>
              <div className="font-semibold text-primary text-lg">Externer Provider</div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Provider verantwortet Vertrag, Session, Payment, Beleg, Refund und Enforcement.
            </p>
            <div className="mt-6 text-xs uppercase tracking-wider text-accent">ParkPunkt übernimmt</div>
            <ul className="mt-3 space-y-2 text-sm">
              {["Standort anzeigen", "Provider erklären", "App/Web öffnen", "Referral loggen", "Affiliate-Provision"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-2xl border border-transparent p-8 text-primary-foreground"
            style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 backdrop-blur flex items-center justify-center font-bold">B</div>
              <div className="font-semibold text-lg">ParkPunkt Marketplace</div>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/80">
              ParkPunkt managt die vollständige Transaktion inkl. Settlement zum Betreiber.
            </p>
            <div className="mt-6 text-xs uppercase tracking-wider text-accent-glow">Wir managen</div>
            <ul className="mt-3 space-y-2 text-sm">
              {["Booking", "Payment", "Confirmation", "Access Pass", "Cancellation", "Operator Settlement", "Support Case", "Refund"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-glow" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function OperatorSuite() {
  const modules = [
    { icon: Building2, t: "Site-Setup", d: "Geometrie, Zonen, Kapazität, Kameras, Schranken." },
    { icon: Gauge, t: "Tarif-Engine", d: "Zeitfenster, Rabatte, Sonderpreise, dynamisches Pricing." },
    { icon: Users, t: "Belegung", d: "Live-Auslastung, Prognose, Auslastungs-Alerts." },
    { icon: Euro, t: "Abrechnung", d: "Automatisches Settlement, Reports, Steuer-Export." },
    { icon: Shield, t: "Enforcement", d: "Streifen-App, Verstöße, Foto-Beweise, Ticketing." },
    { icon: BarChart3, t: "Analytics", d: "KPIs, Kohorten, Umsatz, Auslastungs-Heatmaps." },
  ];
  return (
    <section id="operator" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="16-19 · Betreiber-Suite"
          title="Ein Cockpit für den gesamten Standort"
          desc="Von der Inbetriebnahme bis zum Enforcement — alle Betreiber-Werkzeuge in einer Konsole."
        />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <div key={m.t} className="rounded-2xl border border-border bg-card p-6 hover:border-accent/50 transition-colors">
              <m.icon className="h-6 w-6 text-accent" />
              <div className="mt-4 font-semibold text-primary">{m.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{m.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Enforcement() {
  return (
    <section className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-accent-glow">19 · Enforcement</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold">Verstöße erfassen. Fair. Nachweisbar.</h2>
          <p className="mt-4 text-primary-foreground/80 leading-relaxed">
            Die Enforcement-App der Ordnungskräfte erfasst Verstöße mit Geo-Stamp,
            Foto-Beweisen und Kennzeichen-Match zur aktiven Session — sofort synchronisiert
            mit dem Ticketing-Backend.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { k: "GPS", v: "Geo-Stamp" },
              { k: "Foto", v: "Beweiskette" },
              { k: "OCR", v: "Kennzeichen" },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                <div className="text-lg font-bold text-accent-glow">{x.k}</div>
                <div className="text-xs text-primary-foreground/70">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-primary-foreground/70">
            <span>Ticket #48291</span>
            <span className="rounded-full bg-destructive/20 text-destructive-foreground px-2 py-0.5">Verstoß</span>
          </div>
          <div className="mt-3 text-2xl font-semibold">Unbezahltes Parken · Zone C</div>
          <div className="mt-1 text-sm text-primary-foreground/60">Kennzeichen B-MW 8842 · 14:32 Uhr</div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-primary-foreground/10" />
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <button className="flex-1 rounded-lg bg-accent text-accent-foreground text-sm font-semibold py-2.5">Ticket ausstellen</button>
            <button className="rounded-lg border border-primary-foreground/20 px-4 text-sm font-semibold">Notiz</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Architecture() {
  const layers = [
    { t: "Client Apps", d: "Fahrer-App (iOS/Android), Betreiber-Web, Enforcement-Mobile, Admin-Konsole" },
    { t: "API Gateway", d: "TanStack Start · Server Functions · Rate-Limit · Auth" },
    { t: "Domain Services", d: "Booking · Payment · Tariff · Provider · Enforcement · ANPR" },
    { t: "Data Layer", d: "Postgres + Row-Level-Security · Redis Cache · Event Bus" },
    { t: "Edge & Devices", d: "Kameras · Schranken · Webhooks · Provider-Integrationen" },
  ];
  return (
    <section id="architecture" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="22-28 · Architektur"
          title="Modular. Sicher. Skalierbar."
          desc="Klare Trennung von Client, API, Domain und Daten — mit Row-Level-Security als Fundament."
        />
        <div className="mt-12 space-y-3">
          {layers.map((l, i) => (
            <div
              key={l.t}
              className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6 hover:shadow-[var(--shadow-soft)] transition-shadow"
            >
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center font-mono font-bold text-primary-foreground flex-shrink-0"
                style={{ background: "var(--gradient-brand)" }}
              >
                L{i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-primary">{l.t}</div>
                <div className="text-sm text-muted-foreground">{l.d}</div>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SuperAdmin() {
  return (
    <section className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="21 · Super-Admin"
          title="Rollen & Governance"
          desc="Rollenmodell für ParkPunkt-Betrieb: Support, Refunds, Integrationen, Account-Management."
        />
        <div className="mt-12 grid md:grid-cols-4 gap-4">
          {[
            { t: "Refunds bearbeiten", i: CreditCard },
            { t: "Support-Tickets", i: Users },
            { t: "Integrations-Logs", i: BarChart3 },
            { t: "Accounts sperren", i: Lock },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-border bg-card p-5">
              <x.i className="h-5 w-5 text-accent" />
              <div className="mt-3 text-sm font-semibold text-primary">{x.t}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BuildOrder() {
  const stages = [
    { s: "Stage 1", t: "Commercial MVP", d: "Fahrer-App, Provider-Discovery (Route A), Betreiber-Grundfunktionen, Payments." },
    { s: "Stage 2", t: "Marketplace", d: "Route B mit Settlement, ANPR-Integration, Enforcement-App." },
    { s: "Stage 3", t: "Platform", d: "Partner-Webhooks, White-Label SDK, Embedded Widgets, Analytics-Dashboards." },
  ];
  return (
    <section id="build" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader
          eyebrow="53 · Roadmap"
          title="Empfohlene Build-Reihenfolge"
          desc="Drei Stufen bis zur vollständigen Plattform."
        />
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {stages.map((st, i) => (
            <div
              key={st.s}
              className={`rounded-2xl p-6 ${
                i === 0 ? "bg-card border border-border" : i === 1 ? "bg-card border border-accent/40" : "text-primary-foreground border border-transparent"
              }`}
              style={i === 2 ? { background: "var(--gradient-hero)" } : undefined}
            >
              <div className={`text-xs uppercase tracking-wider ${i === 2 ? "text-accent-glow" : "text-accent"}`}>{st.s}</div>
              <div className={`mt-2 text-xl font-bold ${i === 2 ? "" : "text-primary"}`}>{st.t}</div>
              <p className={`mt-3 text-sm leading-relaxed ${i === 2 ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{st.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <img src={logoAsset.url} alt="ParkPunkt" className="mx-auto h-14 w-auto" />
        <h2 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-primary">
          Bereit für die nächste Generation Parken?
        </h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Buchen Sie eine Demo — wir zeigen Ihnen die Plattform live: Fahrer-App,
          Betreiber-Cockpit, ANPR-Simulation und Enforcement.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="mailto:hello@parkpunkt.app"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-brand)" }}
          >
            Demo anfragen <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#top"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-primary"
          >
            Nach oben
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={logoAsset.url} alt="ParkPunkt" className="h-8 w-auto" />
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ParkPunkt · Finden. Parken. Bezahlen.
          </span>
        </div>
        <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
          <a href="#driver" className="hover:text-primary">Fahrer</a>
          <a href="#operator" className="hover:text-primary">Betreiber</a>
          <a href="#anpr" className="hover:text-primary">ANPR</a>
          <a href="#architecture" className="hover:text-primary">Architektur</a>
          <a href="#build" className="hover:text-primary">Roadmap</a>
        </div>
      </div>
    </footer>
  );
}
