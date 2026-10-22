import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug, parseCatalogParams } from "@/features/catalog/queries";
import { CatalogSkeleton, CatalogView } from "@/components/products/catalog-view";

export async function generateMetadata(props: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name}.`,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: category.image_url ? { images: [category.image_url] } : undefined,
  };
}

export default function CategoryPage(props: PageProps<"/categories/[slug]">) {
  return (
    <div className="container-page pt-8 md:pt-12">
      <Suspense fallback={<HeadingSkeleton />}>
        <CategoryHeading params={props.params} />
      </Suspense>
      <Suspense fallback={<CatalogSkeleton />}>
        <Results params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function HeadingSkeleton() {
  return (
    <div className="mb-10 space-y-3">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-16 w-72 rounded" />
    </div>
  );
}

async function CategoryHeading({ params }: { params: PageProps<"/categories/[slug]">["params"] }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <header className="mb-10">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted">
        <Link href="/products" className="hover:text-ink">
          Shop
        </Link>{" "}
        / <span aria-current="page">{category.name}</span>
      </nav>
      <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)]">{category.name}</h1>
      {category.description ? <p className="mt-3 max-w-xl text-sm text-muted">{category.description}</p> : null}
    </header>
  );
}

async function Results({
  params,
  searchParams,
}: {
  params: PageProps<"/categories/[slug]">["params"];
  searchParams: PageProps<"/categories/[slug]">["searchParams"];
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) return null;
  return <CatalogView params={parseCatalogParams(sp, category.slug)} basePath={`/categories/${category.slug}`} lockCategory />;
}
