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
 * Hero design "Orange stage": an orange banner with the headline, and the
 * categories as a fanned hand of cards that spreads out on hover (globals.css,
 * "Fan hero"). Each card opens its category.
 */
export function FanHero({ lines, subtitle, ctaLabel, ctaHref, items }: Props) {
  const cards = items.slice(0, 5);
  const mid = (cards.length - 1) / 2;
  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="relative grid overflow-hidden rounded-2xl bg-accent px-5 pt-12 pb-6 md:px-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-12 xl:px-16">
        <span aria-hidden className="absolute -top-32 -left-32 size-96 rounded-full border-[56px] border-white/10" />
        <span aria-hidden className="absolute right-[-6rem] bottom-[-8rem] size-[26rem] rounded-full bg-accent-strong/60" />

        <div className="relative z-10 text-center lg:text-left">
          <h1 className="display text-[clamp(2.9rem,12vw,4.75rem)] leading-[0.9] text-white lg:text-[clamp(4.2rem,6vw,6.25rem)]">
            {lines.map((line, i) => (
              <span key={i} className={cn("block", line.accent && "text-ink")}>
                {line.text}
              </span>
            ))}
          </h1>
          {subtitle ? <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed font-medium text-ink lg:mx-0">{subtitle}</p> : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              {ctaLabel} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <span className="text-[13px] font-semibold text-ink">{items.length} categories · cash on delivery</span>
          </div>
        </div>

        <div className="fan relative z-10 mx-auto mt-10 h-[270px] w-full max-w-[560px] sm:h-[360px] lg:mt-0 lg:h-[440px]">
          {cards.map((item, i) => {
            const offset = i - mid;
            return (
              <Link
                key={item.slug}
                href={item.href}
                aria-label={item.label}
                className="fan-card group absolute bottom-4 left-1/2 w-[40%] max-w-[230px] sm:bottom-6 sm:w-[46%] rounded-2xl bg-card p-2.5 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.45)] ring-1 ring-black/5"
                style={{ "--o": offset, "--a": Math.abs(offset), zIndex: 10 - Math.abs(Math.round(offset * 2)) } as React.CSSProperties}
              >
                <span className="relative block aspect-[4/4.4] overflow-hidden rounded-xl bg-canvas">
                  <ProductImage src={item.image} alt="" fill sizes="230px" className="transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className="flex items-center justify-between gap-2 px-1.5 pt-2.5 pb-1">
                  <span className="truncate text-[13px] font-semibold text-ink">{item.name}</span>
                  <span className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">{item.eyebrow.split(" ")[0]}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
