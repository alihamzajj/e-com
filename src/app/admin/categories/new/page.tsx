import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/admin/category-form";
import { FormSkeleton } from "@/components/admin/common";
import { PageHeading } from "@/components/ui/primitives";

export const metadata = { title: "New category" };

async function NewCategory() {
  await requirePermission("products");
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name").order("name");
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/categories" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Categories
      </Link>
      <PageHeading title="New category" description="Add an image and assign products after creating it." />
      <CategoryForm
        categoryId={null}
        parents={(data ?? []) as { id: string; name: string }[]}
        initial={{ name: "", slug: "", description: "", parentId: "", isVisible: true, sortOrder: 0 }}
      />
    </div>
  );
}

export default function NewCategoryPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewCategory />
    </Suspense>
  );
}
