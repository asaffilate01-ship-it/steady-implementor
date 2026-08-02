import { Accessibility, BatteryCharging, LocateFixed, MapPin } from "lucide-react";
import type { Site } from "@/lib/parkpunkt-db";
import { euros } from "@/lib/parkpunkt-db";
import { cn } from "@/lib/utils";

export type ParkingMapSite = Site & { distanceKm: number; free: number };

type SmartParkingMapProps = {
  sites: ParkingMapSite[];
  selectedId?: string;
  destination: string;
  onSelect: (id: string) => void;
  labels: {
    mapLabel: string;
    destinationLabel: string;
    free: string;
    perHour: string;
    noResults: string;
  };
};

/**
 * Key-free, accessible map canvas for the discovery flow.
 *
 * Coordinates are projected into a local visual viewport. A contracted map provider can later
 * replace only this component without changing filtering, selection or the result-list contract.
 */
export function SmartParkingMap({
  sites,
  selectedId,
  destination,
  onSelect,
  labels,
}: SmartParkingMapProps) {
  const points = projectSites(sites);

  return (
    <section
      aria-label={labels.mapLabel}
      className="relative isolate min-h-[28rem] overflow-hidden rounded-2xl border border-border/70 bg-[#dfe9dd] shadow-[var(--shadow-soft)] dark:bg-[#18251f] lg:min-h-[38rem]"
    >
      <div
        className="absolute inset-0 opacity-55 dark:opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(28deg, transparent 44%, rgba(255,255,255,.95) 45%, rgba(255,255,255,.95) 50%, transparent 51%), linear-gradient(114deg, transparent 46%, rgba(255,255,255,.8) 47%, rgba(255,255,255,.8) 51%, transparent 52%), radial-gradient(circle at 72% 22%, rgba(112,177,134,.55) 0 11%, transparent 12%), radial-gradient(circle at 19% 74%, rgba(112,177,134,.45) 0 13%, transparent 14%)",
          backgroundSize: "15rem 15rem, 21rem 21rem, 100% 100%, 100% 100%",
        }}
      />
      <div
        className="absolute inset-0 opacity-25"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(22,52,92,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(22,52,92,.18) 1px, transparent 1px)",
          backgroundSize: "3rem 3rem",
        }}
      />

      <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl border border-white/70 bg-background/90 px-3 py-2 text-sm shadow-lg backdrop-blur-md">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <LocateFixed className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {labels.destinationLabel}
          </span>
          <span className="block truncate font-medium">{destination}</span>
        </span>
      </div>

      {points.map(({ site, left, top }) => {
        const selected = site.id === selectedId;
        const scarce = site.free < 5;
        return (
          <button
            key={site.id}
            type="button"
            onClick={() => onSelect(site.id)}
            aria-pressed={selected}
            aria-label={`${site.name}, ${euros(site.price_cents_per_hour)} ${labels.perHour}, ${site.free} ${labels.free}`}
            className="group absolute z-10 -translate-x-1/2 -translate-y-full text-left focus-visible:outline-none"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span
              className={cn(
                "relative flex items-center gap-1 rounded-full border-2 px-2.5 py-1.5 text-xs font-bold tabular-nums shadow-[0_8px_20px_-6px_rgba(15,23,42,.45)] transition duration-200 group-hover:-translate-y-1 group-focus-visible:ring-4 group-focus-visible:ring-ring/40",
                selected
                  ? "scale-110 border-primary-foreground bg-primary text-primary-foreground"
                  : scarce
                    ? "border-white bg-destructive text-destructive-foreground"
                    : "border-white bg-background text-foreground",
              )}
            >
              {euros(site.price_cents_per_hour)}
              {site.amenities.some((item) => /ev|charge|laden/i.test(item)) && (
                <BatteryCharging className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {site.amenities.some((item) =>
                /accessible|disabled|barrier.free|rollstuhl/i.test(item),
              ) && <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />}
              <span
                className={cn(
                  "absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent",
                  selected
                    ? "border-t-primary"
                    : scarce
                      ? "border-t-destructive"
                      : "border-t-white",
                )}
                aria-hidden="true"
              />
            </span>
          </button>
        );
      })}

      {sites.length === 0 && (
        <div className="absolute inset-0 z-20 grid place-items-center p-6">
          <div className="max-w-xs rounded-2xl border border-border bg-background/95 p-5 text-center shadow-xl backdrop-blur">
            <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">{labels.noResults}</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-20 rounded-lg border border-white/70 bg-background/85 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
        ParkPunkt discovery map
      </div>
    </section>
  );
}

function projectSites(sites: ParkingMapSite[]) {
  if (sites.length === 0) return [];
  const lats = sites.map((site) => site.lat);
  const lngs = sites.map((site) => site.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.008);
  const lngRange = Math.max(maxLng - minLng, 0.008);

  return sites.map((site, index) => ({
    site,
    left: clamp(12 + ((site.lng - minLng) / lngRange) * 76 + ((index % 3) - 1) * 1.8, 9, 91),
    top: clamp(20 + ((maxLat - site.lat) / latRange) * 65 + ((index % 2) - 0.5) * 3, 18, 89),
  }));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
