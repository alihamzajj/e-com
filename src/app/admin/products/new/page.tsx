import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/product-form";
import { FormSkeleton } from "@/components/admin/common";
import { PageHeading } from "@/components/ui/primitives";

export const metadata = { title: "New product" };

async function NewProduct() {
  await requirePermission("products");
  const settings = await getStoreSettings();
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name").order("sort_order").order("name");
  return (
    <div className="space-y-5">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Products
      </Link>
      <PageHeading title="New product" description="Save the product first, then add images." />
      <ProductForm productId={null} initial={EMPTY_PRODUCT} categories={(data ?? []) as { id: string; name: string }[]} currency={settings.currency} />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewProduct />
    </Suspense>
  );
}
