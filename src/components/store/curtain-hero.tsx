import Image from "next/image";
import Link from "next/link";
import { ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hero products shown in the row under the copy: transparent cut-outs, sized by
// height so they share a baseline. Swap these for your own product cut-outs.
const HERO_PRODUCTS = [
  { src: "/demo/fashion/cutout-dress-sand.webp", width: 608, height: 841, alt: "Linen summer dress in sand", className: "h-[clamp(150px,30vw,360px)]" },
  { src: "/demo/fashion/cutout-crossbody-ember.webp", width: 494, height: 635, alt: "Leather crossbody bag in ember", className: "h-[clamp(105px,20vw,250px)]" },
  { src: "/demo/fashion/cutout-tote-black.webp", width: 596, height: 614, alt: "Canvas market tote in black", className: "h-[clamp(100px,19vw,235px)]" },
];

const SPARKLES = [
  { className: "top-[6%] left-[12%] size-7 text-accent md:size-9", delay: "0s" },
  { className: "top-[22%] right-[10%] size-5 text-ink md:size-7", delay: "0.8s" },
  { className: "bottom-[30%] left-[4%] size-4 text-ink md:size-5", delay: "1.6s" },
];

/** Splits the store name into the two curtain halves, e.g. NORTHKEY → NORTH / KEY. */
function wordmarkHalves(name: string): [string, string] {
  const clean = name.trim().toUpperCase();
  const space = clean.indexOf(" ");
  if (space > 0) return [clean.slice(0, space), clean.slice(space + 1)];
  const cut = Math.ceil(clean.length * 0.6);
  return [clean.slice(0, cut), clean.slice(cut)];
}

function Sparkle({ className, delay }: { className: string; delay: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`nk-sparkle ${className}`} style={{ animationDelay: delay }}>
      <path fill="currentColor" d="M12 0c.9 7.2 3.4 10.6 12 12-8.6 1.4-11.1 4.8-12 12-.9-7.2-3.4-10.6-12-12C8.6 10.6 11.1 7.2 12 0Z" />
    </svg>
  );
}

type Props = {
  storeName: string;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Homepage hero with a looping brand "curtain" reveal. Pure CSS keyframes
 * (see globals.css, "Hero curtain reveal"); prefers-reduced-motion hides the
 * curtain and shows everything static.
 */
export function CurtainHero({ storeName, title, subtitle, ctaLabel, ctaHref }: Props) {
  const [left, right] = wordmarkHalves(storeName);
  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="relative overflow-hidden rounded-2xl bg-surface px-5 pt-14 text-center md:pt-20">
        {/* Curtain: covers the hero only, so the sticky navbar always stays above it. */}
        <div className="nk-curtain" aria-hidden>
          <div className="nk-curtain-panel left">
            <span className="nk-wordmark display">{left}</span>
          </div>
          <div className="nk-curtain-panel right">
            <span className="nk-wordmark display">{right}</span>
          </div>
        </div>

        <div className="nk-copy relative z-10">
          <h1 className="display mx-auto max-w-5xl text-[clamp(2.6rem,9vw,7.75rem)] text-ink">{title}</h1>
          {subtitle ? <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">{subtitle}</p> : null}
          <div className="mt-8">
            <Button asChild size="lg" className="group">
              <Link href={ctaHref}>
                {ctaLabel} <ChevronsRight className="nudge" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        {/* Product row sits below the button (no overlap); the orbit ring spins behind it. */}
        <div className="nk-stage mx-auto mt-10 flex max-w-5xl items-end justify-center gap-3 pb-8 sm:gap-8 md:mt-14 md:gap-14 md:pb-12">
          <div className="nk-orbit" aria-hidden>
            <span className="nk-orbit-dot -top-[7px] left-1/2 -translate-x-1/2 bg-accent" />
            <span className="nk-orbit-dot top-1/2 -right-[7px] -translate-y-1/2 bg-ink" />
          </div>
          {SPARKLES.map((s) => (
            <Sparkle key={s.delay} {...s} />
          ))}
          {HERO_PRODUCTS.map((p, i) => (
            <div key={p.src} className="nk-pop" style={{ "--i": i } as React.CSSProperties}>
              <div className="nk-float" style={{ "--i": i } as React.CSSProperties}>
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  priority={i === 0}
                  sizes="(min-width: 1024px) 280px, 26vw"
                  className={`${p.className} w-auto select-none`}
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
