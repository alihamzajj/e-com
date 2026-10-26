import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm, CategoryImage, CategoryProducts } from "@/components/admin/category-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormSkeleton, SectionCard } from "@/components/admin/common";
import { PageHeading } from "@/components/ui/primitives";
import { deleteCategoryAction } from "@/actions/admin/categories";

export const metadata = { title: "Edit category" };

type Cat = { id: string; name: string; slug: string; description: string | null; parent_id: string | null; is_visible: boolean; sort_order: number; image_url: string | null };

async function EditCategory({ params }: { params: PageProps<"/admin/categories/[id]">["params"] }) {
  await requirePermission("products");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const [{ data: category }, { data: all }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("products").select("id, name, status, category_id, categories(name)").order("name").limit(2000),
  ]);
  if (!category) notFound();
  const c = category as Cat;
  type P = { id: string; name: string; status: string; category_id: string | null; categories: { name: string } | null };

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/admin/categories" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Categories
      </Link>
      <PageHeading
        title={c.name}
        description={`/categories/${c.slug}`}
        actions={
          <ConfirmButton
            title="Delete this category?"
            description="Only empty categories can be deleted. Move its products first, or hide the category instead."
            confirmLabel="Delete"
            action={deleteCategoryAction.bind(null, c.id)}
            redirectTo="/admin/categories"
          >
            Delete
          </ConfirmButton>
        }
      />
      <CategoryForm
        categoryId={c.id}
        parents={(all ?? []) as { id: string; name: string }[]}
        initial={{
          name: c.name,
          slug: c.slug,
          description: c.description ?? "",
          parentId: c.parent_id ?? "",
          isVisible: c.is_visible,
          sortOrder: c.sort_order,
        }}
      />
      <SectionCard title="Image" description="Shown on the home page category section.">
        <CategoryImage categoryId={c.id} url={c.image_url} />
      </SectionCard>
      <SectionCard title="Products in this category">
        <CategoryProducts
          categoryId={c.id}
          products={((products ?? []) as unknown as P[]).map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            categoryName: p.categories?.name ?? null,
            inCategory: p.category_id === c.id,
          }))}
        />
      </SectionCard>
    </div>
  );
}

export default function EditCategoryPage(props: PageProps<"/admin/categories/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditCategory params={props.params} />
    </Suspense>
  );
}
