"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductImage } from "@/components/products/product-image";
import { cn } from "@/lib/utils/cn";

export type MegaCategory = {
  slug: string;
  name: string;
  href: string;
  subs: { name: string; href: string }[];
  products: { name: string; href: string; image: string | null; price: string }[];
};

type Props = {
  id: string;
  open: boolean;
  categories: MegaCategory[];
  onClose: (refocus: boolean) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

/**
 * Full-width "Shop" panel under the header: top-level categories on the left,
 * the hovered (or focused) category's subcategories in the middle and its best
 * sellers on the right.
 */
export function MegaPanel({ id, open, categories, onClose, onPointerEnter, onPointerLeave }: Props) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const active = categories.find((c) => c.slug === activeSlug) ?? categories[0];
  if (!active) return null;

  return (
    <div
      id={id}
      inert={!open}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose(true);
      }}
      className={cn(
        "absolute inset-x-0 top-full border-t border-line-soft bg-canvas shadow-[0_24px_40px_-24px_rgb(0_0_0/0.25)] duration-200 ease-out",
        // Visible at once on open (so focus can move in); stays visible while it fades out on close.
        open
          ? "visible translate-y-0 opacity-100 transition-[opacity,transform]"
          : "invisible -translate-y-2 opacity-0 transition-[opacity,transform,visibility]",
      )}
    >
      <div className="container-page grid grid-cols-[13rem_12rem_minmax(0,1fr)] gap-8 py-7 lg:grid-cols-[15rem_14rem_minmax(0,1fr)] lg:gap-10">
        <ul className="space-y-0.5" aria-label="Categories">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={c.href}
                prefetch
                onPointerEnter={() => setActiveSlug(c.slug)}
                onFocus={() => setActiveSlug(c.slug)}
                onClick={() => onClose(false)}
                aria-current={c.slug === active.slug ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-sm px-3 py-2.5 text-[15px] font-medium transition-colors",
                  c.slug === active.slug ? "bg-card text-ink shadow-sm ring-1 ring-line-soft" : "text-ink-soft hover:text-ink",
                )}
              >
                {c.name}
                <ArrowRight className={cn("size-3.5 transition-opacity", c.slug === active.slug ? "opacity-100" : "opacity-0")} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <div>
          <p className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">{active.name}</p>
          <ul className="mt-3 space-y-0.5">
            {active.subs.map((s) => (
              <li key={s.href}>
                <Link href={s.href} prefetch onClick={() => onClose(false)} className="block rounded-sm px-1 py-1.5 text-sm text-ink-soft hover:text-accent">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={active.href}
            onClick={() => onClose(false)}
            className="group mt-4 inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-ink hover:text-accent"
          >
            Shop all {active.name} <ArrowRight className="nudge size-3.5" aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-3 gap-4" aria-label={`Popular in ${active.name}`}>
          {active.products.map((p) => (
            <li key={p.href}>
              <Link href={p.href} onClick={() => onClose(false)} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-md bg-card ring-1 ring-line-soft">
                  <ProductImage src={p.image} alt={p.name} fill sizes="200px" className="zoom-img" />
                </div>
                <p className="mt-2 line-clamp-1 text-[13px] font-medium text-ink group-hover:text-accent">{p.name}</p>
                <p className="text-[13px] text-muted">{p.price}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
