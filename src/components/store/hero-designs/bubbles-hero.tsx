import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductImage } from "@/components/products/product-image";
import { cn } from "@/lib/utils/cn";
import type { OrbitItem } from "../orbit-hero";

type Props = {
  lines: { text: string; accent: boolean }[];
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  items: OrbitItem[];
};

/** Where each circle floats on wide screens (left/right %, top %, size px), first six categories. */
const SPOTS = [
  { side: "left", x: 4, y: 10, size: 150 },
  { side: "right", x: 5, y: 8, size: 136 },
  { side: "left", x: 12, y: 56, size: 124 },
  { side: "right", x: 13, y: 54, size: 158 },
  { side: "left", x: 26, y: 78, size: 92 },
  { side: "right", x: 29, y: 4, size: 88 },
] as const;

/**
 * Hero design "Bubbles": the headline in the middle and the category circles
 * floating gently around it at different sizes (globals.css, "Bubbles hero").
 * On phones the circles sit in a swipeable row under the button instead.
 */
export function BubblesHero({ lines, subtitle, ctaLabel, ctaHref, items }: Props) {
  const bubbles = items.slice(0, SPOTS.length);
  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="relative overflow-hidden rounded-2xl bg-card px-5 py-14 ring-1 ring-line-soft md:px-10 lg:min-h-[620px] lg:py-24">
        <span aria-hidden className="absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)]" />
        <span aria-hidden className="absolute top-[18%] left-[38%] hidden size-2.5 rounded-full bg-accent lg:block" />
        <span aria-hidden className="absolute right-[36%] bottom-[16%] hidden size-4 rounded-full bg-accent/70 lg:block" />

        {/* Floating circles, wide screens only */}
        {bubbles.map((item, i) => {
          const spot = SPOTS[i];
          return (
            <Link
              key={item.slug}
              href={item.href}
              aria-label={item.label}
              className="bubble group absolute hidden flex-col items-center gap-2 lg:flex"
              style={
                {
                  [spot.side]: `${spot.x}%`,
                  top: `${spot.y}%`,
                  "--d": `${i * -1.3}s`,
                } as React.CSSProperties
              }
            >
              <span
                className="relative block overflow-hidden rounded-full bg-canvas shadow-[0_20px_44px_-20px_rgb(0_0_0/0.45)] ring-[6px] ring-card transition-transform duration-500 group-hover:scale-110"
                style={{ width: spot.size, height: spot.size }}
              >
                <ProductImage src={item.image} alt="" fill sizes={`${spot.size}px`} />
              </span>
              <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {item.name}
              </span>
            </Link>
          );
        })}

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-accent-strong uppercase">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden /> {items.length} categories · cash on delivery
          </p>
          <h1 className="display mt-6 text-[clamp(2.9rem,12vw,4.75rem)] leading-[0.9] text-ink lg:text-[clamp(4.5rem,6.4vw,6.5rem)]">
            {lines.map((line, i) => (
              <span key={i} className={cn("block", line.accent && "text-accent")}>
                {line.text}
              </span>
            ))}
          </h1>
          {subtitle ? <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">{subtitle}</p> : null}
          <Link
            href={ctaHref}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-[#C2410C] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#9A3412]"
          >
            {ctaLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {/* Phones and tablets: the same circles in a swipeable row */}
        <ul className="relative -mx-5 mt-10 flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:-mx-10 md:justify-center md:px-10 lg:hidden [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <li key={item.slug} className="shrink-0">
              <Link href={item.href} aria-label={item.label} className="flex w-24 flex-col items-center gap-2 text-center">
                <span className="relative block size-24 overflow-hidden rounded-full bg-canvas shadow-[0_14px_30px_-16px_rgb(0_0_0/0.45)] ring-4 ring-card">
                  <ProductImage src={item.image} alt="" fill sizes="96px" />
                </span>
                <span className="text-xs font-semibold text-ink">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
