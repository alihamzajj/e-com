import Link from "next/link";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/primitives";
import { RatingStars } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { discountPercent, stockState } from "@/lib/pricing";
import { ProductImage } from "./product-image";
import { AddToCartButton } from "./add-to-cart-button";
import type { CatalogProduct } from "@/types/domain";

type Props = { product: CatalogProduct; currency: string; locale: string; priority?: boolean; revealIndex?: number };

export function ProductCard({ product, currency, locale, priority, revealIndex }: Props) {
  const href = `/products/${product.slug}`;
  const hasRange = product.max_variant_price > product.min_variant_price;
  // compare-at is the list price when the whole product is on sale.
  const compareAt = !hasRange && product.sale_price != null && product.min_variant_price < product.price ? product.price : null;
  const off = compareAt ? discountPercent(product.min_variant_price, compareAt) : 0;
  const stock = stockState(product.total_stock, product.low_stock_threshold);
  const singleVariant = product.variant_count === 1 && product.default_variant_id;

  return (
    <article
      data-reveal={revealIndex === undefined ? undefined : ""}
      style={revealIndex === undefined ? undefined : ({ "--i": revealIndex } as React.CSSProperties)}
      className="lift group relative flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-line-soft">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-surface" tabIndex={-1} aria-hidden>
        <ProductImage
          src={product.image_url}
          alt={product.image_alt ?? product.name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          priority={priority}
          className="zoom-img"
        />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
          {off > 0 ? <Badge tone="accent">−{off}%</Badge> : null}
          {stock === "out_of_stock" ? <Badge tone="dark">Sold out</Badge> : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category_name ? <p className="eyebrow !text-[11px]">{product.category_name}</p> : null}
        <h3 className="text-sm leading-snug font-semibold text-ink">
          <Link href={href} prefetch className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {product.rating_count > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <RatingStars value={product.rating_avg} size={12} />
            <span>({product.rating_count})</span>
          </div>
        ) : null}
        {/* Phones: price above a full-width button; wider screens: side by side. */}
        <div className="mt-auto flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-0.5">
            <Price amount={product.min_variant_price} compareAt={compareAt} currency={currency} locale={locale} from={hasRange} size="sm" />
            <span
              className={
                stock === "out_of_stock" ? "text-[11px] text-muted" : stock === "low_stock" ? "text-[11px] font-medium text-warning" : "text-[11px] text-success"
              }
            >
              {stock === "out_of_stock" ? "Out of stock" : stock === "low_stock" ? `Only ${product.total_stock} left` : "In stock"}
            </span>
          </div>
          <div className="relative z-10 [&>*]:w-full sm:[&>*]:w-auto">
            {stock === "out_of_stock" ? null : singleVariant ? (
              <AddToCartButton variantId={product.default_variant_id!} size="sm" variant="dark" className="max-sm:h-9" label="Add" aria-label={`Add ${product.name} to cart`} />
            ) : (
              <Button asChild size="sm" variant="outline" className="max-sm:h-9">
                <Link href={href} aria-label={`Choose options for ${product.name}`}>
                  Options
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  currency,
  locale,
  className,
  reveal,
}: {
  products: CatalogProduct[];
  currency: string;
  locale: string;
  className?: string;
  /** Stagger cards in as they scroll into view. */
  reveal?: boolean;
}) {
  return (
    <div className={className ?? "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} currency={currency} locale={locale} priority={i < 4} revealIndex={reveal ? i : undefined} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg bg-card ring-1 ring-line-soft">
          <div className="skeleton aspect-square" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
