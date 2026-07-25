import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const p = height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0;
      setProgress(p);
      setVisible(scrollTop > 320);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const size = 52;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <button
      aria-label={t("back.top")}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-24 right-4 z-40 grid place-items-center rounded-full border border-border/70 bg-background/90 shadow-[var(--shadow-elegant)] backdrop-blur transition-all duration-300 sm:bottom-6 sm:right-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      style={{ width: size, height: size }}
      type="button"
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="fill-none stroke-[color:var(--accent)] transition-[stroke-dashoffset] duration-150"
        />
      </svg>
      <ArrowUp className="relative h-4 w-4 text-foreground" />
    </button>
  );
}