import type { Metadata } from "next";
import { Suspense } from "react";
import { parseCatalogParams } from "@/features/catalog/queries";
import { CatalogSkeleton, CatalogView } from "@/components/products/catalog-view";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Browse the full catalog with filters for category, price and availability.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <div className="container-page pt-8 md:pt-12">
      <header className="mb-10">
        <p className="eyebrow mb-2">Catalog</p>
        <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)]">All products</h1>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const params = parseCatalogParams(await searchParams);
  return <CatalogView params={params} basePath="/products" />;
}
