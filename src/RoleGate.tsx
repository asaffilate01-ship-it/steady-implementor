import { Facebook, Instagram, Linkedin, Youtube, type LucideIcon } from "lucide-react";
import type { ReactElement, SVGProps } from "react";

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.797l-5.32-6.955L4.3 22H1.542l6.98-7.978L1.5 2h6.914l4.81 6.36L18.244 2Zm-2.383 18h1.882L7.24 4H5.22l10.641 16Z" />
    </svg>
  );
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M19.6 6.7a5.4 5.4 0 0 1-3.2-1v9.6a6.1 6.1 0 1 1-6.1-6.1c.3 0 .6 0 .9.1v3a3.1 3.1 0 1 0 2.2 3V2h2.9a5.4 5.4 0 0 0 3.3 4.7v0Z" />
    </svg>
  );
}

type SvgComp = (p: SVGProps<SVGSVGElement>) => ReactElement;
type Social = { label: string; href: string; Icon: LucideIcon | SvgComp };

export const SOCIALS: Social[] = [
  { label: "X", href: "https://x.com/parkpunkt", Icon: XIcon },
  { label: "TikTok", href: "https://tiktok.com/@parkpunkt", Icon: TikTokIcon },
  { label: "Instagram", href: "https://instagram.com/parkpunkt", Icon: Instagram },
  { label: "Facebook", href: "https://facebook.com/parkpunkt", Icon: Facebook },
  { label: "YouTube", href: "https://youtube.com/@parkpunkt", Icon: Youtube },
  { label: "LinkedIn", href: "https://linkedin.com/company/parkpunkt", Icon: Linkedin },
];

export function SocialRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {SOCIALS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          target="_blank"
          rel="noreferrer"
          className="grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-secondary/40 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:text-foreground"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

export function ShareRow({
  title,
  url,
  className = "",
}: {
  title: string;
  url: string;
  className?: string;
}) {
  const enc = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);
  const shares: { label: string; href: string; Icon: SvgComp | LucideIcon }[] = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${enc}&text=${encTitle}`,
      Icon: XIcon,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
      Icon: Facebook,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`,
      Icon: Linkedin,
    },
  ];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {shares.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Share on ${label}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/60 hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </a>
      ))}
    </div>
  );
}
