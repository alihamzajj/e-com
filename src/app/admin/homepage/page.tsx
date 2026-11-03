import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { mapSettings } from "@/features/settings/queries";
import { OrbitPicker, type PickerProduct } from "@/components/admin/orbit-picker";
import { FormSkeleton } from "@/components/admin/common";
import { Card, PageHeading } from "@/components/ui/primitives";

export const metadata = { title: "Homepage" };

type Row = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  category: { name: string } | null;
  product_images: { url: string; position: number }[];
};

async function Homepage() {
  await requirePermission("settings");
  const supabase = await createClient();
  const [{ data: settingsRow, error }, { data: products }] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("products")
      .select("id, name, price, sale_price, category:categories(name), product_images(url, position)")
      .eq("status", "active")
      .order("name")
      .limit(1000),
  ]);
  if (error || !settingsRow) return <Card role="alert" className="p-6 text-sm text-danger">Homepage settings could not be loaded.</Card>;
  const settings = mapSettings(settingsRow);

  const options: PickerProduct[] = ((products ?? []) as unknown as Row[]).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name ?? null,
    price: Number(p.price),
    salePrice: p.sale_price == null ? null : Number(p.sale_price),
    image: [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
  }));

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeading
        title="Homepage"
        description="Choose the products that circle the top of the home page. Prices come straight from each product, so they always match checkout."
      />
      <OrbitPicker
        products={options}
        initialIds={(settings.hero.product_ids ?? []).filter((id) => options.some((o) => o.id === id))}
        currency={settings.currency}
        locale={settings.locale}
      />
    </div>
  );
}

export default function HomepageAdminPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Homepage />
    </Suspense>
  );
}
