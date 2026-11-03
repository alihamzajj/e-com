import Link from "next/link";
import { Banknote, Truck } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import type { CatalogProduct, StoreSettings } from "@/types/domain";
import type { HeroProps } from "./orbit-hero";
import { ProductOrbit } from "./product-orbit";
import { ORBIT_CUTOUTS } from "@/features/catalog/orbit-cutouts";

/**
 * The orbit looks best with products floating on white, as in the design. Demo
 * photos use their transparent cut-out; a PNG the owner uploads is assumed to be
 * a cut-out too. Anything else is shown as a round photo instead.
 */
function orbitImage(url: string | null): { image: string | null; cutout: boolean } {
  const demo = url?.match(/^\/demo\/fashion\/([a-z0-9-]+)\.webp$/);
  if (demo && ORBIT_CUTOUTS.has(demo[1])) return { image: `/demo/fashion/cutout/${demo[1]}.webp`, cutout: true };
  return { image: url, cutout: Boolean(url && /\.png(\?|$)/i.test(url)) };
}

/**
 * Default orbit until the owner picks products: best sellers that have a clean
 * cut-out, one per category in turn so the ring shows the range of the shop.
 */
export function defaultOrbitProducts(popular: CatalogProduct[], count: number): CatalogProduct[] {
  const ranked = [...popular].sort((a, b) => Number(orbitImage(b.image_url).cutout) - Number(orbitImage(a.image_url).cutout));
  const byCategory = new Map<string, CatalogProduct[]>();
  for (const p of ranked) {
    const key = p.category_slug ?? "";
    byCategory.set(key, [...(byCategory.get(key) ?? []), p]);
  }
  const picked: CatalogProduct[] = [];
  for (let round = 0; picked.length < count && round < ranked.length; round++) {
    for (const list of byCategory.values()) if (list[round] && picked.length < count) picked.push(list[round]);
  }
  return picked;
}

/** Every sentence split into two rows ("Wear the" / "moment."); the last sentence's rows are orange. */
function headlineRows(title: string): { text: string; accent: boolean }[] {
  const sentences = title.trim().match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [title];
  return sentences.flatMap((sentence, i) => {
    const words = sentence.split(/\s+/);
    const accent = sentences.length > 1 && i === sentences.length - 1;
    if (words.length < 2) return [{ text: sentence, accent }];
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(" "), words.slice(half).join(" ")].map((text) => ({ text, accent }));
  });
}

/**
 * Homepage hero: copy on the left and, on the right, the products picked in
 * Admin → Homepage (or the best sellers until some are picked) circling an
 * orange centre that shows each one with its live price. Headline, subtitle and
 * main button come from Admin → Settings. On phones the orbit sits on top.
 */
export function ProductOrbitHero({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  products,
  settings,
}: HeroProps & { products: CatalogProduct[]; settings: StoreSettings }) {
  const rows = headlineRows(title);
  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category_name ?? "New in",
    price: formatMoney(p.effective_price, settings.currency, settings.locale),
    href: `/products/${p.slug}`,
    ...orbitImage(p.image_url),
  }));
  const delay = (n: number) => ({ "--d": `${n}s` }) as React.CSSProperties;

  return (
    <section className="container-page pt-2 pb-6 md:pt-4 lg:pb-16">
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="lg:order-2">
          <ProductOrbit products={items} />
        </div>

        <div className="relative z-10">
          <h1 className="display text-[clamp(4rem,8.4vw,7.75rem)] leading-[0.9] text-[#1A120D]">
            {rows.map((row, i) => (
              <span key={i} className="orbit-line-mask">
                <span className={`orbit-rise block${row.accent ? " text-accent" : ""}`} style={delay(0.05 + i * 0.1)}>
                  {row.text}
                </span>
              </span>
            ))}
          </h1>
          {subtitle ? (
            <p className="orbit-rise mt-7 max-w-[34ch] text-base leading-relaxed text-[#5C534C] md:text-lg" style={delay(0.15 + rows.length * 0.1)}>
              {subtitle}
            </p>
          ) : null}
          <div className="orbit-rise mt-8 flex flex-wrap gap-3" style={delay(0.25 + rows.length * 0.1)}>
            <Link
              href={ctaHref}
              className="inline-flex h-[52px] flex-1 items-center justify-center rounded-full bg-accent px-[26px] text-[15px] font-bold text-white shadow-[0_8px_20px_rgb(255_90_31/0.28)] transition hover:-translate-y-0.5 hover:bg-[#D9430F] hover:shadow-[0_12px_26px_rgb(255_90_31/0.36)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent min-[481px]:flex-none"
            >
              {ctaLabel}
            </Link>
            <Link
              href="/products?sort=newest"
              className="inline-flex h-[52px] flex-1 items-center justify-center rounded-full border-2 border-[#1A120D] px-[26px] text-[15px] font-bold text-[#1A120D] transition hover:-translate-y-0.5 hover:bg-[#1A120D] hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent min-[481px]:flex-none"
            >
              New arrivals
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#1A120D]">
            <li className="flex items-center gap-2">
              <Truck className="size-[18px] text-accent" aria-hidden />
              {settings.freeShippingThreshold
                ? `Free delivery over ${formatMoney(settings.freeShippingThreshold, settings.currency, settings.locale)}`
                : "Fast nationwide delivery"}
            </li>
            {settings.codEnabled ? (
              <li className="flex items-center gap-2">
                <Banknote className="size-[18px] text-accent" aria-hidden /> Cash on delivery
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
