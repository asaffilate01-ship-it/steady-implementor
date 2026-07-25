import { useSyncExternalStore } from "react";

export type Site = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  pricePerHour: number;
  operator: string;
  amenities: string[];
  type: "street" | "garage" | "lot";
};

export type Session = {
  id: string;
  siteId: string;
  plate: string;
  startedAt: number;
  endsAt: number;
  pricePerHour: number;
  status: "active" | "ended";
  amountCents: number;
  paymentMethod: string;
};

export type Notice = {
  id: string;
  plate: string;
  siteId: string;
  reason: string;
  amountCents: number;
  createdAt: number;
};

const SEED_SITES: Site[] = [
  { id: "S001", name: "City Center Parking", address: "Marktplatz 1, Berlin", lat: 52.520, lng: 13.405, capacity: 240, occupied: 187, pricePerHour: 3.5, operator: "APCOA", amenities: ["EV", "24/7", "Covered"], type: "garage" },
  { id: "S002", name: "Hauptbahnhof P+R",   address: "Europaplatz 1, Berlin", lat: 52.525, lng: 13.369, capacity: 480, occupied: 302, pricePerHour: 2.0, operator: "Contipark", amenities: ["EV", "24/7"], type: "garage" },
  { id: "S003", name: "Alexanderplatz Straße", address: "Alexanderplatz, Berlin", lat: 52.521, lng: 13.413, capacity: 32, occupied: 30, pricePerHour: 4.0, operator: "Stadt Berlin", amenities: ["On-street"], type: "street" },
  { id: "S004", name: "Kulturforum Lot", address: "Matthäikirchplatz, Berlin", lat: 52.508, lng: 13.367, capacity: 120, occupied: 45, pricePerHour: 2.5, operator: "Q-Park", amenities: ["Disabled"], type: "lot" },
  { id: "S005", name: "Prenzlauer Berg Garage", address: "Schönhauser Allee 80", lat: 52.539, lng: 13.412, capacity: 180, occupied: 96, pricePerHour: 2.8, operator: "APCOA", amenities: ["EV", "Covered"], type: "garage" },
  { id: "S006", name: "Kreuzberg Kotti", address: "Kottbusser Tor", lat: 52.499, lng: 13.418, capacity: 45, occupied: 41, pricePerHour: 3.0, operator: "Stadt Berlin", amenities: ["On-street"], type: "street" },
];

type State = {
  sites: Site[];
  sessions: Session[];
  notices: Notice[];
  plate: string;
  paymentMethod: string;
};

const KEY = "parkpunkt.v1";

function load(): State {
  if (typeof window === "undefined") {
    return { sites: SEED_SITES, sessions: [], notices: [], plate: "B-PP 2026", paymentMethod: "Visa •• 4242" };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { sites: SEED_SITES, sessions: [], notices: [], plate: "B-PP 2026", paymentMethod: "Visa •• 4242" };
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  setPlate(plate: string) { state = { ...state, plate }; persist(); },
  setPaymentMethod(pm: string) { state = { ...state, paymentMethod: pm }; persist(); },
  updateSite(id: string, patch: Partial<Site>) {
    state = { ...state, sites: state.sites.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    persist();
  },
  addSite(site: Site) { state = { ...state, sites: [site, ...state.sites] }; persist(); },
  startSession(siteId: string, minutes: number): Session {
    const site = state.sites.find((s) => s.id === siteId)!;
    const now = Date.now();
    const session: Session = {
      id: "SES-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      siteId, plate: state.plate,
      startedAt: now, endsAt: now + minutes * 60_000,
      pricePerHour: site.pricePerHour,
      status: "active",
      amountCents: Math.round((site.pricePerHour * minutes / 60) * 100),
      paymentMethod: state.paymentMethod,
    };
    state = {
      ...state,
      sessions: [session, ...state.sessions],
      sites: state.sites.map((s) => s.id === siteId ? { ...s, occupied: Math.min(s.capacity, s.occupied + 1) } : s),
    };
    persist();
    return session;
  },
  endSession(id: string) {
    const s = state.sessions.find((x) => x.id === id);
    if (!s || s.status === "ended") return;
    state = {
      ...state,
      sessions: state.sessions.map((x) => x.id === id ? { ...x, status: "ended" as const, endsAt: Date.now() } : x),
      sites: state.sites.map((y) => y.id === s.siteId ? { ...y, occupied: Math.max(0, y.occupied - 1) } : y),
    };
    persist();
  },
  extendSession(id: string, minutes: number) {
    state = {
      ...state,
      sessions: state.sessions.map((x) => {
        if (x.id !== id) return x;
        const add = Math.round((x.pricePerHour * minutes / 60) * 100);
        return { ...x, endsAt: x.endsAt + minutes * 60_000, amountCents: x.amountCents + add };
      }),
    };
    persist();
  },
  issueNotice(plate: string, siteId: string, reason: string, amountEuros: number) {
    const notice: Notice = {
      id: "N-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      plate, siteId, reason, amountCents: Math.round(amountEuros * 100), createdAt: Date.now(),
    };
    state = { ...state, notices: [notice, ...state.notices] };
    persist();
    return notice;
  },
  reset() {
    state = { sites: SEED_SITES, sessions: [], notices: [], plate: "B-PP 2026", paymentMethod: "Visa •• 4242" };
    persist();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => store.subscribe(l),
    () => selector(store.get()),
    () => selector(load()),
  );
}

export function euros(cents: number) {
  return "€" + (cents / 100).toFixed(2);
}

export function haversineKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}