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

const INTERVAL = 3200;

/**
 * Hero design "Dial": a wheel of category circles turning round an orange disc
 * near the right edge. Every few seconds the wheel clicks round
 * one step and the circle nearest the headline grows and shows its name.
 * Clicking a circle turns the wheel to it; hovering pauses.
 */
export function DialHero({ lines, subtitle, ctaLabel, ctaHref, items }: Props) {
  const n = items.length;
  // Counts steps without wrapping, so the wheel always turns the same way.
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = n ? ((step % n) + n) % n : 0;
  const angle = n ? 360 / n : 0;

  useEffect(() => {
    if (paused || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setStep((s) => s + 1), INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, n]);

  const goTo = (i: number) => setStep((s) => s + ((i - active + n) % n));
  const current = items[active];

  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="relative grid overflow-hidden rounded-2xl bg-card ring-1 ring-line-soft lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="relative z-10 px-5 pt-12 text-center md:px-10 lg:py-16 lg:pr-0 lg:text-left xl:pl-16">
          <h1 className="display text-[clamp(2.8rem,11vw,4.5rem)] leading-[0.92] text-ink lg:text-[clamp(4rem,5.6vw,5.75rem)]">
            {lines.map((line, i) => (
              <span key={i} className={cn("block", line.accent && "text-accent")}>
                {line.text}
              </span>
            ))}
          </h1>
          {subtitle ? <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft lg:mx-0">{subtitle}</p> : null}
          <Link
            href={ctaHref}
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-md bg-[#C2410C] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#9A3412]"
          >
            {ctaLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div
          className="dial relative mt-8 h-[400px] sm:h-[460px] lg:mt-0 lg:h-[580px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* Disc and ring, centred near the right edge (globals.css, .dial --cx) */}
          <span aria-hidden className="dial-ring absolute top-1/2 rounded-full border border-dashed border-ink/20" />
          <span aria-hidden className="dial-disc absolute top-1/2 flex items-center justify-center rounded-full bg-accent shadow-[0_30px_60px_-30px_rgb(194_65_12/0.8)]">
            {current ? (
              <span key={current.slug} className="dial-copy px-6 text-center text-white">
                <span className="block text-[10px] font-semibold tracking-[0.2em] text-white/80 uppercase">{current.eyebrow}</span>
                <span className="display mt-1 block text-[clamp(1.5rem,3vw,2.4rem)] leading-[0.95]">{current.name}</span>
              </span>
            ) : null}
          </span>

          <div className="dial-wheel absolute top-1/2 size-0" style={{ "--turn": `${-step * angle}deg` } as React.CSSProperties}>
            {items.map((item, i) => (
              <div
                key={item.slug}
                className="dial-slot absolute top-0 left-0"
                style={{ "--a": `${i * angle}deg`, zIndex: i === active ? 2 : 1 } as React.CSSProperties}
              >
                <Link
                  href={item.href}
                  aria-label={item.label}
                  onClick={(e) => {
                    if (i !== active) {
                      e.preventDefault();
                      goTo(i);
                    }
                  }}
                  className={cn(
                    "dial-item group block rounded-full bg-card p-1.5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.4)] ring-1 ring-line-soft",
                    i === active && "is-active",
                  )}
                >
                  <span className="relative block size-full overflow-hidden rounded-full bg-canvas">
                    <ProductImage src={item.image} alt="" fill sizes="180px" className="transition-transform duration-500 group-hover:scale-110" />
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
