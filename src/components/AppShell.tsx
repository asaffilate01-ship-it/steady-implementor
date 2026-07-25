import { Link, useRouterState } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/driver", label: "Driver" },
  { to: "/operator", label: "Operator" },
  { to: "/provider", label: "Provider Hub" },
  { to: "/enforcement", label: "Enforcement" },
  { to: "/admin", label: "Admin" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="ParkPunkt" className="h-8 w-auto" />
          </Link>
          <nav className="ml-4 flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}