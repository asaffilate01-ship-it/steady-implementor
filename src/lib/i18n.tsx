import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "de";

const DICT = {
  en: {
    "nav.driver": "Driver App",
    "nav.operator": "Operator",
    "nav.provider": "Provider Hub",
    "nav.enforcement": "Enforcement",
    "nav.admin": "Admin",
    "nav.signin": "Sign in",
    "nav.signout": "Sign out",
    "nav.workspace": "Open workspace",

    "home.badge": "Parking OS",
    "home.title.1": "Finden. Parken.",
    "home.title.2": "Bezahlen.",
    "home.subtitle":
      "One platform connecting drivers, operators, cities and providers. Search a spot, start a session, and settle the fare — contactless, in seconds.",
    "home.cta.driver": "Try the driver app",
    "home.cta.signin": "Sign in for operators",
    "home.badge.anpr": "ANPR-ready",
    "home.badge.psd2": "PSD2 compliant",
    "home.badge.gdpr": "GDPR by design",

    "home.stake.title": "One platform, every role",
    "home.stake.sub":
      "ParkPunkt unifies the parking value chain — from the driver at the kerb to the operator, the enforcement officer and the mobility provider.",
    "home.stake.driver.title": "Drivers",
    "home.stake.driver.body": "Find nearby spots, start a session in one tap, extend or end from your phone.",
    "home.stake.driver.cta": "Open driver app",
    "home.stake.operator.title": "Operators",
    "home.stake.operator.body": "Manage sites, tariffs and occupancy in real time. Track revenue and utilisation.",
    "home.stake.operator.cta": "Operator dashboard",
    "home.stake.enforce.title": "Enforcement",
    "home.stake.enforce.body": "ANPR-driven verification — scan a plate, see the session status, issue a notice.",
    "home.stake.enforce.cta": "Enforcement tools",
    "home.stake.provider.title": "Providers",
    "home.stake.provider.body": "Plug into the orchestration API to quote, book and settle across the network.",
    "home.stake.provider.cta": "Provider hub",

    "home.how.title": "How it works",
    "home.how.sub":
      "Three steps for the driver. Everything else — pricing, entitlements, settlement — is handled by the orchestration layer.",
    "home.how.find.title": "Find",
    "home.how.find.body": "Search by address or POI. See live availability, rates and distance.",
    "home.how.park.title": "Park",
    "home.how.park.body": "Book a slot instantly. ANPR opens the barrier — no ticket, no app juggling.",
    "home.how.pay.title": "Pay",
    "home.how.pay.body": "Charged only for the time used. Receipts land in your account automatically.",
    "home.how.step": "Step",

    "home.feat.title": "Built for the whole parking stack",
    "home.feat.sub":
      "From the phone at the kerb to the settlement engine — every layer is integrated, observable and compliant.",

    "home.cta.final.title": "Ready to run parking on ParkPunkt?",
    "home.cta.final.sub":
      "Drivers can start now. Operators, providers and enforcement teams get access after signing in.",
    "home.cta.final.open": "Open driver app",
    "home.cta.final.go": "Go to workspace",

    "session.live": "LIVE",
    "session.active": "Active session",
    "session.remaining": "Time remaining",
    "session.plate": "Plate",
    "session.rate": "Rate",
    "session.charged": "Charged",

    "dev.title": "Developer sign-in",
    "dev.sub": "One-click accounts pre-loaded with roles for local testing.",
    "dev.hint": "Password for all dev accounts: devpass1234",
    "dev.creating": "Signing in…",
  },
  de: {
    "nav.driver": "Fahrer-App",
    "nav.operator": "Betreiber",
    "nav.provider": "Anbieter-Hub",
    "nav.enforcement": "Kontrolle",
    "nav.admin": "Admin",
    "nav.signin": "Anmelden",
    "nav.signout": "Abmelden",
    "nav.workspace": "Arbeitsbereich öffnen",

    "home.badge": "Park-Betriebssystem",
    "home.title.1": "Finden. Parken.",
    "home.title.2": "Bezahlen.",
    "home.subtitle":
      "Eine Plattform, die Fahrer, Betreiber, Städte und Anbieter verbindet. Parkplatz finden, Sitzung starten und kontaktlos bezahlen — in Sekunden.",
    "home.cta.driver": "Fahrer-App testen",
    "home.cta.signin": "Für Betreiber anmelden",
    "home.badge.anpr": "ANPR-fähig",
    "home.badge.psd2": "PSD2-konform",
    "home.badge.gdpr": "DSGVO by Design",

    "home.stake.title": "Eine Plattform, jede Rolle",
    "home.stake.sub":
      "ParkPunkt vereint die Wertschöpfungskette des Parkens — vom Fahrer am Bordstein bis zum Betreiber, Kontrolleur und Mobilitätsanbieter.",
    "home.stake.driver.title": "Fahrer",
    "home.stake.driver.body": "Parkplätze in der Nähe finden, mit einem Tipp starten, verlängern oder beenden.",
    "home.stake.driver.cta": "Fahrer-App öffnen",
    "home.stake.operator.title": "Betreiber",
    "home.stake.operator.body": "Standorte, Tarife und Auslastung in Echtzeit verwalten. Umsatz und Nutzung im Blick.",
    "home.stake.operator.cta": "Betreiber-Dashboard",
    "home.stake.enforce.title": "Kontrolle",
    "home.stake.enforce.body": "ANPR-gestützte Prüfung — Kennzeichen scannen, Sitzung prüfen, Bescheid ausstellen.",
    "home.stake.enforce.cta": "Kontroll-Tools",
    "home.stake.provider.title": "Anbieter",
    "home.stake.provider.body": "Über die Orchestrations-API anfragen, buchen und im Netzwerk abrechnen.",
    "home.stake.provider.cta": "Anbieter-Hub",

    "home.how.title": "So funktioniert es",
    "home.how.sub":
      "Drei Schritte für den Fahrer. Alles andere — Preise, Berechtigungen, Abrechnung — übernimmt die Orchestrierung.",
    "home.how.find.title": "Finden",
    "home.how.find.body": "Nach Adresse oder POI suchen. Live-Verfügbarkeit, Preise und Entfernung sehen.",
    "home.how.park.title": "Parken",
    "home.how.park.body": "Sofort buchen. ANPR öffnet die Schranke — kein Ticket, kein App-Wirrwarr.",
    "home.how.pay.title": "Bezahlen",
    "home.how.pay.body": "Nur für genutzte Zeit zahlen. Belege landen automatisch im Konto.",
    "home.how.step": "Schritt",

    "home.feat.title": "Für den gesamten Parking-Stack gebaut",
    "home.feat.sub":
      "Vom Smartphone am Bordstein bis zur Abrechnungs-Engine — jede Schicht ist integriert, beobachtbar und konform.",

    "home.cta.final.title": "Bereit für Parken mit ParkPunkt?",
    "home.cta.final.sub":
      "Fahrer können sofort loslegen. Betreiber, Anbieter und Kontrolleure erhalten Zugang nach Anmeldung.",
    "home.cta.final.open": "Fahrer-App öffnen",
    "home.cta.final.go": "Zum Arbeitsbereich",

    "session.live": "LIVE",
    "session.active": "Aktive Sitzung",
    "session.remaining": "Restzeit",
    "session.plate": "Kennz.",
    "session.rate": "Tarif",
    "session.charged": "Berechnet",

    "dev.title": "Entwickler-Anmeldung",
    "dev.sub": "Ein-Klick-Konten mit vorbereiteten Rollen für lokale Tests.",
    "dev.hint": "Passwort für alle Dev-Konten: devpass1234",
    "dev.creating": "Anmeldung…",
  },
} as const;

type Key = keyof typeof DICT["en"];

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("pp.lang") as Lang | null)) || null;
    if (saved === "en" || saved === "de") setLangState(saved);
    else if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("de")) setLangState("de");
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("pp.lang", l);
  };
  const t = (k: Key) => (DICT[lang] as Record<string, string>)[k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex overflow-hidden rounded-md border border-border text-xs ${className}`}>
      {(["en", "de"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 uppercase transition-colors ${lang === l ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-secondary"}`}
          type="button"
        >
          {l}
        </button>
      ))}
    </div>
  );
}