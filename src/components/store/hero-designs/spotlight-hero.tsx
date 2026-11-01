"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const INTERVAL = 4000;

/**
 * Hero design "Spotlight": headline on the left, one category at a time in a big
 * card on the right, changing every few seconds. Tabs under the headline jump to
 * a category; hovering the card pauses the rotation.
 */
export function SpotlightHero({ lines, subtitle, ctaLabel, ctaHref, items }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % items.length), INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, items.length]);

  const current = items[active];

  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="relative grid overflow-hidden rounded-2xl bg-card px-5 py-10 ring-1 ring-line-soft md:px-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:py-14 xl:px-16">
        <div className="relative z-10 min-w-0 text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-accent-strong uppercase">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden /> {items.length} categories in store
          </p>
          <h1 className="display mt-5 text-[clamp(2.8rem,11vw,4.5rem)] leading-[0.92] text-ink lg:text-[clamp(4rem,5.6vw,5.75rem)]">
            {lines.map((line, i) => (
              <span key={i} className={cn("block", line.accent && "text-accent")}>
                {line.text}
              </span>
            ))}
          </h1>
          {subtitle ? <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft lg:mx-0">{subtitle}</p> : null}
          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-accent-strong"
            >
              {ctaLabel} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div role="tablist" aria-label="Categories" className="-mx-5 mt-9 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-10 md:px-10 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
            {items.map((item, i) => (
              <button
                key={item.slug}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  "relative inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-full pr-4 pl-1 text-[13px] font-medium whitespace-nowrap transition-colors",
                  i === active ? "bg-ink text-white" : "bg-canvas text-ink-soft ring-1 ring-line-soft hover:text-ink",
                )}
              >
                <span className="relative size-8 overflow-hidden rounded-full bg-card">
                  <ProductImage src={item.image} alt="" fill sizes="32px" />
                </span>
                {item.name}
                {i === active && !paused ? (
                  <span
                    key={active}
                    aria-hidden
                    className="spot-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent"
                    style={{ animationDuration: `${INTERVAL}ms` }}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {current ? (
          <div
            className="relative mt-10 lg:mt-0"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <span aria-hidden className="absolute -inset-6 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)]" />
            <Link
              href={current.href}
              aria-label={current.label}
              className="group relative block aspect-[4/3.4] overflow-hidden rounded-2xl bg-canvas ring-1 ring-line-soft"
            >
              {items.map((item, i) => (
                <span
                  key={item.slug}
                  aria-hidden
                  className={cn(
                    "absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    i === active ? "scale-100 opacity-100" : "scale-[1.06] opacity-0",
                  )}
                >
                  <ProductImage src={item.image} alt="" fill sizes="(min-width: 1024px) 45vw, 90vw" className="transition-transform duration-700 group-hover:scale-105" />
                </span>
              ))}
              <span className="display absolute top-4 right-5 text-[clamp(3rem,7vw,5.5rem)] leading-none text-ink/10 tabular-nums">
                {String(active + 1).padStart(2, "0")}
              </span>
              <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 rounded-xl bg-card/95 p-4 shadow-sm backdrop-blur">
                <span>
                  <span className="block text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">{current.eyebrow}</span>
                  <span className="display mt-1 block text-[clamp(1.6rem,3vw,2.2rem)] leading-none text-ink">{current.name}</span>
                </span>
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform group-hover:translate-x-1">
                  <ArrowRight className="size-5" aria-hidden />
                </span>
              </span>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
