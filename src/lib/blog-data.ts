export type BlogPost = {
  slug: string;
  title: { en: string; de: string };
  excerpt: { en: string; de: string };
  body: { en: string[]; de: string[] };
  author: string;
  date: string;
  minutes: number;
  tag: string;
  cover: string;
};

// Editorial cover images (Unsplash CDN, non-personal, permissive for editorial use).
export const POSTS: BlogPost[] = [
  {
    slug: "why-on-street-parking-needs-a-new-os",
    title: {
      en: "Why on-street parking needs a new operating system",
      de: "Warum Straßenparken ein neues Betriebssystem braucht",
    },
    excerpt: {
      en: "Drivers still juggle four apps, three meter machines and a scratched-out zone sign. Here's the case for one platform.",
      de: "Fahrer jonglieren immer noch mit vier Apps, drei Automaten und einem verkratzten Zonenschild. Der Fall für eine Plattform.",
    },
    body: {
      en: [
        "Every European city has quietly become a patchwork of parking apps. A driver arriving in a new district needs to guess the right operator, download an app, register a car and payment method, then try to remember the zone code before their session even starts.",
        "ParkPunkt collapses that to one flow: search, tap, start. Behind the scenes we route the session to the right operator, price it against the local tariff, and settle payment through PSD2-compliant rails.",
        "The result is fewer abandoned sessions, less kerbside friction, and — for cities — a live picture of how their streets are actually being used.",
      ],
      de: [
        "Jede europäische Stadt ist zu einem Flickenteppich aus Park-Apps geworden. Ein Fahrer in einem neuen Bezirk muss den richtigen Betreiber erraten, eine App laden, sich registrieren und dann den Zonencode auswendig lernen — bevor die Sitzung überhaupt beginnt.",
        "ParkPunkt reduziert das auf einen Fluss: suchen, tippen, starten. Im Hintergrund leiten wir die Sitzung an den richtigen Betreiber, bepreisen sie nach lokalem Tarif und rechnen PSD2-konform ab.",
        "Das bedeutet weniger abgebrochene Sitzungen, weniger Reibung am Bordstein — und für Städte ein Live-Bild ihrer Straßennutzung.",
      ],
    },
    author: "Lea Weber",
    date: "2026-07-12",
    minutes: 6,
    tag: "Product",
    cover: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1600&q=70",
  },
  {
    slug: "anpr-without-the-lock-in",
    title: {
      en: "ANPR without the lock-in",
      de: "ANPR ohne Herstellerbindung",
    },
    excerpt: {
      en: "Barrier-less garages don't have to mean vendor-locked garages. A pragmatic guide to interoperable plate recognition.",
      de: "Schrankenlose Parkhäuser müssen nicht herstellergebunden sein. Ein pragmatischer Leitfaden zur interoperablen Kennzeichenerkennung.",
    },
    body: {
      en: [
        "The economics of ANPR (Automatic Number Plate Recognition) have shifted. Camera hardware is commoditised; the moat is now the software that turns a plate into a valid, billable session.",
        "ParkPunkt treats ANPR as an input — not a system of record. Operators keep their existing cameras, we normalise the events, and the same driver session works whether the garage has a barrier, an ANPR gate, or nothing at all.",
        "Enforcement teams get the same benefit: one plate lookup returns a real answer across every venue on the network.",
      ],
      de: [
        "Die Ökonomie von ANPR (Kennzeichenerkennung) hat sich verschoben. Kamerahardware ist austauschbar; der Vorteil liegt heute in der Software, die aus einem Kennzeichen eine gültige, abrechenbare Sitzung macht.",
        "ParkPunkt behandelt ANPR als Eingabe — nicht als System of Record. Betreiber behalten ihre Kameras, wir normalisieren die Ereignisse, und die Fahrer-Sitzung funktioniert mit Schranke, ANPR-Tor oder gar nichts.",
        "Kontrolleure profitieren doppelt: Eine Kennzeichenabfrage liefert eine echte Antwort über das gesamte Netzwerk.",
      ],
    },
    author: "Jonas Richter",
    date: "2026-06-28",
    minutes: 8,
    tag: "Engineering",
    cover: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1600&q=70",
  },
  {
    slug: "gdpr-and-your-license-plate",
    title: {
      en: "GDPR and your licence plate",
      de: "DSGVO und Ihr Kennzeichen",
    },
    excerpt: {
      en: "A licence plate is personal data. Here's how ParkPunkt handles retention, access and enforcement lawfully.",
      de: "Ein Kennzeichen ist ein personenbezogenes Datum. So handhabt ParkPunkt Aufbewahrung, Zugriff und Kontrolle rechtskonform.",
    },
    body: {
      en: [
        "Under the GDPR, a licence plate that can be linked to a natural person is personal data. That means every camera capture, every enforcement lookup and every session record carries obligations.",
        "We minimise retention (plate captures without a matching session are dropped within 24 hours), scope access with row-level security, and expose a self-service data export in the driver app.",
        "Cities and operators inherit those defaults — no bespoke DPIA per deployment.",
      ],
      de: [
        "Nach DSGVO ist ein Kennzeichen, das einer Person zugeordnet werden kann, ein personenbezogenes Datum. Jede Aufnahme, jede Kontrollabfrage und jede Sitzung bringt Pflichten mit sich.",
        "Wir minimieren die Aufbewahrung (Aufnahmen ohne Sitzung werden innerhalb von 24 Stunden gelöscht), schränken den Zugriff per Row-Level Security ein und bieten in der Fahrer-App einen Self-Service-Export.",
        "Städte und Betreiber erben diese Standards — keine individuelle DSFA je Deployment.",
      ],
    },
    author: "Sophie Klein",
    date: "2026-05-14",
    minutes: 5,
    tag: "Compliance",
    cover: "https://images.unsplash.com/photo-1590650046871-92c887180603?auto=format&fit=crop&w=1600&q=70",
  },
];

export function findPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}