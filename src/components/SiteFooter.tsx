import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { useI18n } from "@/lib/i18n";
import { SocialRow } from "@/components/SocialIcons";
import { ManageCookiesButton } from "@/lib/cookies";

export function SiteFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="ParkPunkt" className="h-10 w-auto" />
          </Link>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t("home.subtitle")}</p>
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("foot.social")}</div>
            <SocialRow className="mt-2" />
          </div>
        </div>

        <FootCol title={t("foot.product")}>
          <FootLink to="/drive">{t("foot.driver")}</FootLink>
          <FootLink to="/operator">{t("foot.operator")}</FootLink>
          <FootLink to="/provider">{t("foot.provider")}</FootLink>
          <FootLink to="/enforcement">{t("foot.enforce")}</FootLink>
        </FootCol>

        <FootCol title={t("foot.company")}>
          <FootLink to="/blog">{t("foot.blog")}</FootLink>
          <FootLink to="/legal/imprint">{t("foot.imprint")}</FootLink>
          <FootLink to="/legal/complaints">{t("foot.complaints")}</FootLink>
        </FootCol>

        <FootCol title={t("foot.legal")}>
          <FootLink to="/legal/terms">{t("foot.terms")}</FootLink>
          <FootLink to="/legal/privacy">{t("foot.privacy")}</FootLink>
          <FootLink to="/legal/cookies">{t("foot.cookies")}</FootLink>
          <FootLink to="/legal/gdpr">{t("foot.gdpr")}</FootLink>
          <li>
            <ManageCookiesButton />
          </li>
        </FootCol>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground md:flex-row">
          <div>© {year} ParkPunkt · {t("foot.tag")}</div>
          <div>{t("foot.rights")}</div>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FootLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-foreground/80 transition-colors hover:text-foreground">
        {children}
      </Link>
    </li>
  );
}