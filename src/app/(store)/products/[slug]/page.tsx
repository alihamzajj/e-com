import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getProductBySlug, getRelatedProducts, getVariantStock } from "@/features/catalog/queries";
import { getStoreSettings } from "@/features/settings/queries";
import { ProductGallery } from "@/components/products/product-gallery";
import { PurchasePanel, PurchasePanelSkeleton } from "@/components/products/purchase-panel";
import { QuestionsSection, ReviewsSection, SectionSkeleton } from "@/components/products/product-sections";
import { ProductGrid, ProductGridSkeleton } from "@/components/products/product-card";
import { RatingStars } from "@/components/ui/rating";
import { publicEnv } from "@/lib/config/public";
import { computeUnitPrice, formatMoneyPlain } from "./helpers";
import type { ProductDetail, StoreSettings } from "@/types/domain";

type Params = PageProps<"/products/[slug]">["params"];

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const description = product.short_description ?? product.description?.slice(0, 160) ?? undefined;
  const image = product.images[0]?.url;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description, type: "website", images: image ? [{ url: image, alt: product.images[0].alt ?? product.name }] : undefined },
  };
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <div className="container-page pt-6 md:pt-10">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getStoreSettings()]);
  if (!product) notFound();
  const money = { currency: settings.currency, locale: settings.locale };

  return (
    <>
      <ProductJsonLd product={product} settings={settings} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <Link href="/products" className="tap hover:text-ink">
          Shop
        </Link>
        {product.category ? (
          <>
            {" / "}
            <Link href={`/categories/${product.category.slug}`} className="tap hover:text-ink">
              {product.category.name}
            </Link>
          </>
        ) : null}
        {" / "}
        <span aria-current="page" className="text-ink-soft">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <ProductGallery images={product.images} name={product.name} />
        <div className="space-y-7 lg:pt-2">
          <div className="space-y-3">
            {product.category ? <p className="eyebrow">{product.category.name}</p> : null}
            <h1 className="display text-[clamp(2.5rem,5.5vw,4.5rem)]">{product.name}</h1>
            {product.rating_count > 0 ? (
              <a href="#reviews" className="tap inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
                <RatingStars value={product.rating_avg} /> {product.rating_avg.toFixed(1)} · {product.rating_count} review
                {product.rating_count === 1 ? "" : "s"}
              </a>
            ) : null}
            {product.short_description ? <p className="max-w-prose text-[15px] leading-relaxed text-ink-soft">{product.short_description}</p> : null}
          </div>

          {product.variants.length === 0 ? (
            <p className="rounded-md bg-surface px-4 py-3 text-sm text-muted">This product is not available to order right now.</p>
          ) : (
            <Suspense fallback={<PurchasePanelSkeleton />}>
              <LivePurchasePanel product={product} {...money} />
            </Suspense>
          )}

          <ul className="grid grid-cols-1 gap-3 border-t border-line-soft pt-6 text-sm text-ink-soft sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-accent" aria-hidden />
              {settings.freeShippingThreshold
                ? `Free shipping over ${formatMoneyPlain(settings.freeShippingThreshold, settings)}`
                : "Tracked delivery"}
            </li>
            {settings.policies.returns ? (
              <li className="flex items-center gap-2">
                <RotateCcw className="size-4 text-accent" aria-hidden />
                <Link href="/policies/returns" className="tap hover:underline">
                  Easy returns
                </Link>
              </li>
            ) : null}
            {settings.codEnabled ? (
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent" aria-hidden /> Cash on delivery
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="mt-20 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        {product.description ? (
          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="mb-4 text-lg font-semibold">
              Description
            </h2>
            <div className="max-w-prose space-y-4 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">{product.description}</div>
          </section>
        ) : (
          <div />
        )}
        {product.specifications.length > 0 ? (
          <section aria-labelledby="specs-heading">
            <h2 id="specs-heading" className="mb-4 text-lg font-semibold">
              Specifications
            </h2>
            <dl className="divide-y divide-line-soft rounded-lg bg-card ring-1 ring-line-soft">
              {product.specifications.map((s, i) => (
                <div key={`${s.label}-${i}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-3 text-sm">
                  <dt className="text-muted">{s.label}</dt>
                  <dd className="font-medium text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>

      <section id="reviews" aria-labelledby="reviews-heading" className="mt-20 scroll-mt-24 border-t border-line pt-12">
        <h2 id="reviews-heading" className="display mb-8 text-[clamp(2rem,4vw,3rem)]">
          Reviews
        </h2>
        <Suspense fallback={<SectionSkeleton />}>
          <ReviewsSection
            productId={product.id}
            productSlug={product.slug}
            timezone={settings.timezone}
            ratingAvg={product.rating_avg}
            ratingCount={product.rating_count}
          />
        </Suspense>
      </section>

      <section id="questions" aria-labelledby="questions-heading" className="mt-20 scroll-mt-24 border-t border-line pt-12">
        <h2 id="questions-heading" className="display mb-8 text-[clamp(2rem,4vw,3rem)]">
          Questions &amp; answers
        </h2>
        <Suspense fallback={<SectionSkeleton />}>
          <QuestionsSection productId={product.id} productSlug={product.slug} timezone={settings.timezone} />
        </Suspense>
      </section>

      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Related categorySlug={product.category?.slug ?? null} productId={product.id} {...money} />
      </Suspense>
    </>
  );
}

async function LivePurchasePanel({ product, currency, locale }: { product: ProductDetail; currency: string; locale: string }) {
  const stock = await getVariantStock(product.id);
  return <PurchasePanel product={product} stock={stock} currency={currency} locale={locale} />;
}

async function Related({ categorySlug, productId, currency, locale }: { categorySlug: string | null; productId: string; currency: string; locale: string }) {
  const related = await getRelatedProducts(categorySlug, productId);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-20 border-t border-line pt-12">
      <h2 id="related-heading" className="display mb-8 text-[clamp(2rem,4vw,3rem)]">
        You may also like
      </h2>
      <ProductGrid products={related} currency={currency} locale={locale} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" />
    </section>
  );
}

function ProductJsonLd({ product, settings }: { product: ProductDetail; settings: StoreSettings }) {
  const prices = product.variants.map((v) => computeUnitPrice(product.price, product.sale_price, v.price, v.sale_price));
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? product.description ?? undefined,
    image: product.images.map((i) => (i.url.startsWith("/") ? `${publicEnv.siteUrl}${i.url}` : i.url)),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: settings.storeName },
    ...(product.rating_count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating_avg, reviewCount: product.rating_count } }
      : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: settings.currency,
      lowPrice: prices.length ? Math.min(...prices) : product.price,
      highPrice: prices.length ? Math.max(...prices) : product.price,
      offerCount: product.variants.length,
      url: `${publicEnv.siteUrl}/products/${product.slug}`,
    },
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14" aria-busy aria-label="Loading product">
      <div className="skeleton aspect-square rounded-xl" />
      <div className="space-y-5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-20 w-3/4 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <PurchasePanelSkeleton />
      </div>
    </div>
  );
}
