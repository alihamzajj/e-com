import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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

/** Tile shapes for the first six categories on large screens; the third is the wide orange one. */
const SHAPES = ["", "", "lg:col-span-2 accent", "", "", "lg:col-span-2"];

/**
 * Hero design "Bento": a dark headline card beside a grid of category tiles of
 * different sizes. Every tile opens its category; hovering lifts it and zooms
 * the illustration.
 */
export function BentoHero({ lines, subtitle, ctaLabel, ctaHref, items }: Props) {
  const tiles = items.slice(0, 6);
  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:auto-rows-[minmax(190px,1fr)] lg:grid-cols-4">
        <div className="relative col-span-2 flex flex-col justify-between overflow-hidden rounded-2xl bg-ink p-7 text-white md:p-10 lg:row-span-2">
          <span aria-hidden className="absolute -right-24 -bottom-24 size-72 rounded-full bg-accent/25 blur-3xl" />
          <span aria-hidden className="absolute top-8 right-8 size-3 rounded-full bg-accent" />
          <div className="relative">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">Ghani Traders · New season</p>
            <h1 className="display mt-5 text-[clamp(2.8rem,10vw,4.25rem)] leading-[0.92] lg:text-[clamp(3.5rem,5vw,5rem)]">
              {lines.map((line, i) => (
                <span key={i} className={cn("block", line.accent && "text-accent")}>
                  {line.text}
                </span>
              ))}
            </h1>
          </div>
          <div className="relative mt-8">
            {subtitle ? <p className="max-w-sm text-[15px] leading-relaxed text-white/70">{subtitle}</p> : null}
            <Link
              href={ctaHref}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              {ctaLabel} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        {tiles.map((item, i) => {
          const shape = SHAPES[i] ?? "";
          const accent = shape.includes("accent");
          const wide = shape.includes("col-span-2");
          return (
            <Link
              key={item.slug}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "group relative flex min-h-44 overflow-hidden rounded-2xl ring-1 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgb(0_0_0/0.35)]",
                accent ? "bg-accent ring-accent" : "bg-card ring-line-soft",
                wide ? "col-span-2" : "col-span-1",
                shape.replace("accent", ""),
              )}
            >
              <span
                aria-hidden
                className={cn("absolute overflow-hidden rounded-xl bg-canvas", wide ? "inset-y-2 right-2 w-[52%]" : "inset-x-2 top-2 bottom-[4.5rem]")}
              >
                <ProductImage
                  src={item.image}
                  alt=""
                  fill
                  sizes={wide ? "(min-width: 1024px) 25vw, 55vw" : "(min-width: 1024px) 20vw, 45vw"}
                  className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                />
              </span>
              <span className={cn("relative mt-auto flex w-full items-end justify-between gap-2 p-4", wide && "max-w-[50%] flex-col items-start self-center md:p-6")}>
                <span>
                  <span className={cn("block text-[10px] font-semibold tracking-[0.16em] uppercase", accent ? "text-white/80" : "text-muted")}>{item.eyebrow}</span>
                  <span className={cn("display mt-1 block leading-none", wide ? "text-[clamp(1.6rem,3vw,2.4rem)]" : "text-base sm:text-xl", accent ? "text-white" : "text-ink")}>
                    {item.name}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:rotate-45",
                    accent ? "bg-white text-accent" : "bg-ink text-white",
                    wide && "mt-3",
                  )}
                >
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
