import Link from "next/link";
import { ArrowRight, ChevronsRight, Quote } from "lucide-react";
import { getStoreSettings } from "@/features/settings/queries";
import { getCategories, getProductRail, getRecentReviews } from "@/features/catalog/queries";
import { ProductGrid } from "@/components/products/product-card";
import { ProductImage } from "@/components/products/product-image";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { SectionHeading } from "@/components/store/section-heading";
import type { CatalogProduct } from "@/types/domain";

export default async function HomePage() {
  const [settings, categories, featured, newest, popular, reviews] = await Promise.all([
    getStoreSettings(),
    getCategories(),
    getProductRail("featured", 4),
    getProductRail("newest", 4),
    getProductRail("popular", 4),
    getRecentReviews(3),
  ]);
  const hero = settings.hero;
  const promo = settings.promo;
  const money = { currency: settings.currency, locale: settings.locale };
  const hasCatalog = featured.length + newest.length + popular.length > 0;

  return (
    <>
      {/* Hero */}
      <section className="container-page pt-4 md:pt-6">
        <div className="relative overflow-hidden rounded-2xl bg-surface px-5 pt-14 text-center md:pt-20">
          <h1 className="display mx-auto max-w-5xl text-[clamp(3rem,10vw,7.75rem)] text-ink">
            {hero.title || settings.storeName}
          </h1>
          {hero.subtitle || settings.tagline ? (
            <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">{hero.subtitle || settings.tagline}</p>
          ) : null}
          <Button asChild size="lg" className="mt-8">
            <Link href={hero.cta_href || "/products"}>
              {hero.cta_label || "Shop collection"} <ChevronsRight aria-hidden />
            </Link>
          </Button>
          {hero.image_url ? (
            <div className="relative mx-auto mt-6 aspect-[18/11] w-full max-w-6xl md:-mt-10">
              <ProductImage src={hero.image_url} alt="" fill priority sizes="(min-width: 1280px) 1150px, 100vw" className="object-contain object-bottom" />
            </div>
          ) : (
            <div className="h-16" />
          )}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 ? (
        <section className="container-page mt-20" aria-labelledby="categories-heading">
          <SectionHeading id="categories-heading" eyebrow="Browse" title="Shop by category" href="/products" linkLabel="View all" />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {categories
              .filter((c) => !c.parent_id)
              .slice(0, 8)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-lg bg-card ring-1 ring-line-soft"
                >
                  <ProductImage src={c.image_url} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="transition-transform duration-500 group-hover:scale-105" />
                  <span className="relative m-3 inline-flex w-fit items-center gap-2 rounded-sm bg-card/95 px-3 py-1.5 text-sm font-semibold text-ink shadow-sm">
                    {c.name} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              ))}
          </div>
        </section>
      ) : null}

      <Rail id="featured" eyebrow="Curated" title="Featured" products={featured} href="/products" {...money} />

      {/* Statement */}
      {settings.tagline ? (
        <section className="container-page mt-24">
          <div className="grid items-end gap-8 rounded-2xl bg-card px-6 py-14 md:grid-cols-[1.6fr_1fr] md:px-14">
            <p className="display text-[clamp(2.4rem,6vw,5rem)] text-ink">{settings.tagline}</p>
            <p className="text-sm leading-relaxed text-muted md:text-right">
              Every product is tested before it ships. Prices include taxes{settings.codEnabled ? ", and cash on delivery is available nationwide" : ""}.
            </p>
          </div>
        </section>
      ) : null}

      <Rail id="new" eyebrow="Just landed" title="New arrivals" products={newest} href="/products?sort=newest" {...money} />
      <Rail id="best" eyebrow="Most loved" title="Best sellers" products={popular} href="/products?sort=popular" {...money} />

      {/* Promo */}
      {promo.title ? (
        <section className="container-page mt-24">
          <div className="relative grid overflow-hidden rounded-2xl bg-ink text-white md:grid-cols-2">
            <div className="relative z-10 flex flex-col justify-center gap-5 px-6 py-12 md:px-14">
              {promo.eyebrow ? <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">{promo.eyebrow}</p> : null}
              <h2 className="display text-[clamp(2.2rem,5vw,4.25rem)]">{promo.title}</h2>
              {promo.body ? <p className="max-w-md text-sm leading-relaxed text-white/70">{promo.body}</p> : null}
              {promo.cta_href ? (
                <Button asChild className="w-fit">
                  <Link href={promo.cta_href}>
                    {promo.cta_label || "Shop now"} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
            {promo.image_url ? (
              <div className="relative min-h-60 md:min-h-[380px]">
                <ProductImage src={promo.image_url} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-left" />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Reviews */}
      {reviews.length > 0 ? (
        <section className="container-page mt-24" aria-labelledby="reviews-heading">
          <SectionHeading id="reviews-heading" eyebrow="Verified buyers" title="What customers say" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="flex flex-col gap-4 rounded-lg bg-card p-6 ring-1 ring-line-soft">
                <Quote className="size-5 text-accent" aria-hidden />
                <RatingStars value={r.rating} />
                <blockquote className="flex-1 text-sm leading-relaxed text-ink-soft">
                  {r.title ? <p className="mb-1 font-semibold text-ink">{r.title}</p> : null}
                  <p className="line-clamp-5">{r.body}</p>
                </blockquote>
                <figcaption className="text-xs text-muted">
                  {r.author_name}
                  {r.product ? (
                    <>
                      {" on "}
                      <Link href={`/products/${r.product.slug}`} className="font-medium text-ink hover:underline">
                        {r.product.name}
                      </Link>
                    </>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {!hasCatalog ? (
        <section className="container-page mt-20 text-center text-sm text-muted">
          Products will appear here as soon as they are published in the admin dashboard.
        </section>
      ) : null}

      {/* Newsletter */}
      {settings.newsletterEnabled ? (
        <section className="container-page mt-24">
          <div className="grid items-center gap-6 rounded-2xl bg-accent px-6 py-12 text-accent-ink md:grid-cols-2 md:px-14">
            <div>
              <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)]">Be first in line.</h2>
              <p className="mt-3 max-w-sm text-sm text-white/85">Restocks, new colourways and the occasional discount. No spam.</p>
            </div>
            <NewsletterForm />
          </div>
        </section>
      ) : null}
    </>
  );
}

function Rail({
  id,
  eyebrow,
  title,
  products,
  href,
  currency,
  locale,
}: {
  id: string;
  eyebrow: string;
  title: string;
  products: CatalogProduct[];
  href: string;
  currency: string;
  locale: string;
}) {
  if (products.length === 0) return null;
  return (
    <section className="container-page mt-24" aria-labelledby={`${id}-heading`}>
      <SectionHeading id={`${id}-heading`} eyebrow={eyebrow} title={title} href={href} linkLabel="Shop all" />
      <ProductGrid products={products} currency={currency} locale={locale} className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" />
    </section>
  );
}
