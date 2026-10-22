import Link from "next/link";
import { SearchX } from "lucide-react";
import { getStoreSettings } from "@/features/settings/queries";
import { catalogQueryString, getCategories, searchCatalog, type CatalogParams } from "@/features/catalog/queries";
import { ProductGrid } from "./product-card";
import { ActiveFilterChips, CatalogFilters, MobileFilters, SortSelect, type FilterState } from "./catalog-filters";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/utils/format";

type Props = { params: CatalogParams; basePath: string; lockCategory?: boolean };

/** Filters + results + pagination. Server-rendered; filter controls update the URL. */
export async function CatalogView({ params, basePath, lockCategory }: Props) {
  const [settings, categories, result] = await Promise.all([getStoreSettings(), getCategories(), searchCatalog(params)]);
  const state: FilterState = {
    q: params.q,
    category: params.category,
    min: params.min,
    max: params.max,
    sort: params.sort,
    inStock: params.inStock,
  };
  const filterProps = {
    basePath,
    state,
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    lockCategory,
    currency: settings.currency,
  };
  const hrefFor = (page: number) => `${basePath}${catalogQueryString(params, { page }, lockCategory)}`;

  return (
    <div className="flex gap-10">
      <CatalogFilters {...filterProps} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MobileFilters {...filterProps} />
            <p className="text-sm text-muted" aria-live="polite">
              {pluralize(result.total, "product")}
            </p>
          </div>
          <SortSelect basePath={basePath} state={state} lockCategory={lockCategory} />
        </div>
        <ActiveFilterChips {...filterProps} />
        {result.products.length === 0 ? (
          <div className="rounded-lg bg-card ring-1 ring-line-soft">
            <EmptyState
              icon={<SearchX />}
              title={params.page > 1 ? "No more products" : "No products match"}
              description={
                params.q
                  ? `Nothing found for “${params.q}”. Try a shorter keyword or remove a filter.`
                  : "Try widening the price range or removing a filter."
              }
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href={basePath}>Clear all filters</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ProductGrid
            products={result.products}
            currency={settings.currency}
            locale={settings.locale}
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
          />
        )}
        <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} className="pt-6" />
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="flex gap-10" aria-busy aria-label="Loading products">
      <div className="hidden w-60 shrink-0 space-y-4 lg:block">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-8 rounded" />
        ))}
      </div>
      <div className="flex-1 space-y-5">
        <div className="skeleton h-9 w-48 rounded" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-card ring-1 ring-line-soft">
              <div className="skeleton aspect-square" />
              <div className="space-y-2 p-4">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
