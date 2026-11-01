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

/**
 * Hero design "Bloom": the category circles sit like petals round a large orange
 * centre that links to the whole shop. A soft highlight passes from petal to
 * petal in turn (globals.css, "Bloom hero"); hovering one lifts it and shows its
 * name.
 */
export function BloomHero({ lines, subtitle, ctaLabel, ctaHref, items }: Props) {
  const petals = items.slice(0, 8);
  const n = petals.length;
  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="relative grid overflow-hidden rounded-2xl bg-card px-5 py-12 ring-1 ring-line-soft md:px-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-14 xl:px-16">
        <div className="relative z-10 text-center lg:text-left">
          <h1 className="display text-[clamp(2.8rem,11vw,4.5rem)] leading-[0.92] text-ink lg:text-[clamp(4rem,5.6vw,5.75rem)]">
            {lines.map((line, i) => (
              <span key={i} className={cn("block", line.accent && "text-accent")}>
                {line.text}
              </span>
            ))}
          </h1>
          {subtitle ? <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft lg:mx-0">{subtitle}</p> : null}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-[#C2410C] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#9A3412]"
            >
              {ctaLabel} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
              <span className="flex -space-x-2" aria-hidden>
                {petals.slice(0, 3).map((p) => (
                  <span key={p.slug} className="relative size-7 overflow-hidden rounded-full bg-canvas ring-2 ring-card">
                    <ProductImage src={p.image} alt="" fill sizes="28px" />
                  </span>
                ))}
              </span>
              {items.length} categories to explore
            </span>
          </div>
        </div>

        <div className="bloom relative mx-auto mt-12 lg:mt-0" style={{ "--n": n } as React.CSSProperties}>
          <span aria-hidden className="bloom-ring absolute top-1/2 left-1/2 rounded-full border border-dashed border-ink/15" />
          <Link
            href={ctaHref}
            className="bloom-core group absolute top-1/2 left-1/2 flex flex-col items-center justify-center rounded-full bg-accent text-center text-white shadow-[0_30px_60px_-28px_rgb(194_65_12/0.85)] transition-transform duration-500 hover:scale-105"
          >
            <span className="text-[10px] font-semibold tracking-[0.2em] text-white/80 uppercase">{items.length} categories</span>
            <span className="display mt-1 text-[clamp(1.6rem,4vw,2.4rem)] leading-[0.95]">Shop all</span>
            <span className="mt-2 inline-flex size-8 items-center justify-center rounded-full bg-white text-accent transition-transform group-hover:translate-x-1">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
          {petals.map((item, i) => (
            <Link
              key={item.slug}
              href={item.href}
              aria-label={item.label}
              className="bloom-petal group absolute top-1/2 left-1/2"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="bloom-dot relative block size-full overflow-hidden rounded-full bg-canvas shadow-[0_16px_36px_-18px_rgb(0_0_0/0.45)] ring-[5px] ring-card">
                <ProductImage src={item.image} alt="" fill sizes="140px" className="transition-transform duration-500 group-hover:scale-110" />
              </span>
              <span className="bloom-name absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
