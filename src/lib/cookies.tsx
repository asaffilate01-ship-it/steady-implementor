import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type CookiePrefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string | null;
};

const DEFAULT: CookiePrefs = { necessary: true, analytics: false, marketing: false, decidedAt: null };
const KEY = "pp.cookies.v1";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string, days = 180) {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}
function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const Ctx = createContext<{
  prefs: CookiePrefs;
  decided: boolean;
  open: boolean;
  setOpen: (b: boolean) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (p: Partial<CookiePrefs>) => void;
}>({ prefs: DEFAULT, decided: false, open: false, setOpen: () => {}, acceptAll: () => {}, rejectAll: () => {}, save: () => {} });

export function CookieProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT);
  const [decided, setDecided] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raw = readCookie(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CookiePrefs;
        setPrefs({ ...DEFAULT, ...parsed, necessary: true });
        setDecided(true);
      } catch {
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  }, []);

  function persist(next: CookiePrefs) {
    const withStamp = { ...next, necessary: true as const, decidedAt: new Date().toISOString() };
    setPrefs(withStamp);
    setDecided(true);
    writeCookie(KEY, JSON.stringify(withStamp));
    if (!withStamp.analytics) ["_ga", "_gid", "_gat", "pp_analytics"].forEach(deleteCookie);
    if (!withStamp.marketing) ["_fbp", "pp_marketing"].forEach(deleteCookie);
  }

  const value = useMemo(
    () => ({
      prefs,
      decided,
      open,
      setOpen,
      acceptAll: () => {
        persist({ ...DEFAULT, analytics: true, marketing: true });
        setOpen(false);
      },
      rejectAll: () => {
        persist({ ...DEFAULT, analytics: false, marketing: false });
        setOpen(false);
      },
      save: (p: Partial<CookiePrefs>) => {
        persist({ ...prefs, ...p });
        setOpen(false);
      },
    }),
    [prefs, decided, open],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <CookieBanner />
    </Ctx.Provider>
  );
}

export function useCookies() {
  return useContext(Ctx);
}

function CookieBanner() {
  const { open, setOpen, acceptAll, rejectAll, save, prefs } = useCookies();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState(prefs.analytics);
  const [marketing, setMarketing] = useState(prefs.marketing);
  const [detail, setDetail] = useState(false);
  useEffect(() => {
    setAnalytics(prefs.analytics);
    setMarketing(prefs.marketing);
  }, [prefs]);
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("cookie.title")}</h3>
              <button aria-label="Close" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("cookie.body")}{" "}
              <Link to="/legal/cookies" className="underline hover:text-foreground">
                {t("cookie.learn")}
              </Link>
            </p>
            {detail && (
              <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-secondary/40 p-3 text-sm">
                <Row label={t("cookie.necessary")} sub={t("cookie.necessary.sub")} checked disabled />
                <Row
                  label={t("cookie.analytics")}
                  sub={t("cookie.analytics.sub")}
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <Row
                  label={t("cookie.marketing")}
                  sub={t("cookie.marketing.sub")}
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={acceptAll} className="rounded-full">
                {t("cookie.acceptAll")}
              </Button>
              <Button size="sm" variant="outline" onClick={rejectAll} className="rounded-full">
                {t("cookie.rejectAll")}
              </Button>
              {detail ? (
                <Button size="sm" variant="ghost" onClick={() => save({ analytics, marketing })} className="rounded-full">
                  {t("cookie.save")}
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setDetail(true)} className="rounded-full">
                  {t("cookie.customize")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  sub,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange?: (b: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </label>
  );
}

export function ManageCookiesButton({ className = "" }: { className?: string }) {
  const { setOpen } = useCookies();
  const { t } = useI18n();
  return (
    <button onClick={() => setOpen(true)} className={`hover:text-foreground ${className}`} type="button">
      {t("cookie.manage")}
    </button>
  );
}