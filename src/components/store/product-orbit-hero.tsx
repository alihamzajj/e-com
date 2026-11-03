import Link from "next/link";
import { Banknote, Truck } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import type { CatalogProduct, StoreSettings } from "@/types/domain";
import { titleLines, type HeroProps } from "./orbit-hero";
import { ProductOrbit } from "./product-orbit";

/**
 * Homepage hero with the owner's chosen products (Admin → Homepage) circling an
 * orange centre that shows each one with its live price. Copy and button come
 * from Admin → Settings, as for the category orbit.
 */
export function ProductOrbitHero({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  products,
  settings,
}: HeroProps & { products: CatalogProduct[]; settings: StoreSettings }) {
  const lines = titleLines(title);
  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category_name ?? "New in",
    price: formatMoney(p.effective_price, settings.currency, settings.locale),
    href: `/products/${p.slug}`,
    image: p.image_url,
  }));

  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="orbit-hero relative overflow-hidden rounded-2xl px-5 pt-8 pb-10 md:px-10 lg:flex lg:flex-row-reverse lg:items-center lg:gap-10 lg:py-10 xl:px-16">
        <div className="lg:flex-1">
          <ProductOrbit products={items} />
        </div>

        <div className="relative z-10 mt-8 text-center lg:mt-0 lg:flex-1 lg:text-left">
          <h1 className="display text-[clamp(3rem,13vw,4.75rem)] leading-[0.9] text-ink md:text-[5.5rem] lg:text-[clamp(4.5rem,6.6vw,6.5rem)]">
            {lines.map((line, i) => (
              <span key={i} className="orbit-line-mask">
                <span className={`orbit-rise block${line.accent ? " text-accent" : ""}`} style={{ "--d": `${0.05 + i * 0.1}s` } as React.CSSProperties}>
                  {line.text}
                </span>
              </span>
            ))}
          </h1>
          {subtitle ? (
            <p
              className="orbit-rise mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft lg:mx-0"
              style={{ "--d": `${0.15 + lines.length * 0.1}s` } as React.CSSProperties}
            >
              {subtitle}
            </p>
          ) : null}
          <div
            className="orbit-rise mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
            style={{ "--d": `${0.25 + lines.length * 0.1}s` } as React.CSSProperties}
          >
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center rounded-full bg-[#C2410C] px-7 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#9A3412] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {ctaLabel}
            </Link>
            <Link
              href="/products?sort=newest"
              className="inline-flex h-12 items-center rounded-full border-2 border-ink px-7 text-[15px] font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-ink hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              New arrivals
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-ink-soft lg:justify-start">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-accent" aria-hidden />
              {settings.freeShippingThreshold
                ? `Free delivery over ${formatMoney(settings.freeShippingThreshold, settings.currency, settings.locale)}`
                : "Fast nationwide delivery"}
            </li>
            {settings.codEnabled ? (
              <li className="flex items-center gap-2">
                <Banknote className="size-4 text-accent" aria-hidden /> Cash on delivery
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
