"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { productSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";
import { removeImage, uploadImage } from "@/lib/storage/upload";

function invalidateCatalog(...slugs: (string | null | undefined)[]) {
  updateTag("products");
  updateTag("categories");
  for (const slug of new Set(slugs.filter(Boolean))) updateTag(`product:${slug}`);
}

/** Variant ids that appear on any order. Uses the service role only for this count. */
async function variantsWithOrders(variantIds: string[]): Promise<Set<string>> {
  if (variantIds.length === 0) return new Set();
  if (!isServiceRoleConfigured()) return new Set(variantIds); // be conservative: deactivate, never delete
  const { data } = await createAdminClient().from("order_items").select("variant_id").in("variant_id", variantIds);
  return new Set(((data ?? []) as { variant_id: string }[]).map((r) => r.variant_id));
}

async function productHasOrders(productId: string): Promise<boolean> {
  if (!isServiceRoleConfigured()) return true;
  const { count } = await createAdminClient()
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  return (count ?? 0) > 0;
}

export async function saveProductAction(
  productId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const p = parsed.data;
  const supabase = await createClient();

  const row = {
    name: p.name,
    slug: p.slug,
    category_id: p.categoryId ?? null,
    short_description: p.shortDescription ?? null,
    description: p.description ?? null,
    specifications: p.specifications,
    option_names: p.optionNames,
    price: p.price,
    sale_price: p.salePrice ?? null,
    cost_price: p.costPrice ?? null,
    status: p.status,
    is_featured: p.isFeatured,
    low_stock_threshold: p.lowStockThreshold,
  };

  let id = productId;
  let oldSlug: string | null = null;
  if (id) {
    const { data: before } = await supabase.from("products").select("slug").eq("id", id).maybeSingle();
    if (!before) return { ok: false, error: "Product not found." };
    oldSlug = (before as { slug: string }).slug;
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return fail(error, "admin.product.update");
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error) return fail(error, "admin.product.insert");
    id = (data as { id: string }).id;
  }

  // Variants: remove (or deactivate when they have order history), update, insert.
  const { data: existingRows } = await supabase.from("product_variants").select("id").eq("product_id", id);
  const existingIds = ((existingRows ?? []) as { id: string }[]).map((r) => r.id);
  const keep = new Set(p.variants.map((v) => v.id).filter(Boolean) as string[]);
  const removed = existingIds.filter((vid) => !keep.has(vid));
  if (removed.length) {
    const withOrders = await variantsWithOrders(removed);
    const toDelete = removed.filter((vid) => !withOrders.has(vid));
    const toDeactivate = removed.filter((vid) => withOrders.has(vid));
    if (toDelete.length) {
      const { error } = await supabase.from("product_variants").delete().in("id", toDelete);
      if (error) return fail(error, "admin.variant.delete");
    }
    if (toDeactivate.length) {
      const { error } = await supabase.from("product_variants").update({ is_active: false }).in("id", toDeactivate);
      if (error) return fail(error, "admin.variant.deactivate");
    }
  }

  for (const [position, v] of p.variants.entries()) {
    const fields = {
      sku: v.sku,
      title: v.title,
      options: v.options,
      price: v.price ?? null,
      sale_price: v.salePrice ?? null,
      is_active: v.isActive,
      position,
    };
    if (v.id && existingIds.includes(v.id)) {
      // Existing stock is changed only through admin_adjust_stock (atomic delta),
      // so a stale form can never overwrite units sold in the meantime.
      const { error } = await supabase.from("product_variants").update(fields).eq("id", v.id).eq("product_id", id);
      if (error) return fail(error, "admin.variant.update");
    } else {
      const { error } = await supabase
        .from("product_variants")
        .insert({ ...fields, product_id: id, stock_quantity: v.stockQuantity });
      if (error) return fail(error, "admin.variant.insert");
    }
  }

  invalidateCatalog(p.slug, oldSlug);
  const saved = productId ? "Product saved." : "Product created.";
  const message = p.status === "active" ? saved : `${saved} It's hidden from the store until Status is set to Active.`;
  return { ok: true, data: { id: id!, slug: p.slug }, message };
}

export async function deleteProductAction(productId: string): Promise<ActionResult<{ archived: boolean }>> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  if (!z.uuid().safeParse(productId).success) return { ok: false, error: "Invalid product." };
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };
  const slug = (product as { slug: string }).slug;

  if (await productHasOrders(productId)) {
    const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", productId);
    if (error) return fail(error, "admin.product.archive");
    invalidateCatalog(slug);
    return { ok: true, data: { archived: true }, message: "This product has orders, so it was archived instead of deleted." };
  }

  const { data: images } = await supabase.from("product_images").select("storage_path").eq("product_id", productId);
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return fail(error, "admin.product.delete");
  for (const img of (images ?? []) as { storage_path: string | null }[]) await removeImage(supabase, img.storage_path);
  invalidateCatalog(slug);
  return { ok: true, data: { archived: false }, message: "Product deleted." };
}

export async function setProductStatusAction(productId: string, status: "draft" | "active" | "archived"): Promise<ActionResult> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  if (!z.uuid().safeParse(productId).success || !["draft", "active", "archived"].includes(status)) {
    return { ok: false, error: "Invalid request." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").update({ status }).eq("id", productId).select("slug").single();
  if (error) return fail(error, "admin.product.status");
  invalidateCatalog((data as { slug: string }).slug);
  return { ok: true, data: undefined, message: status === "active" ? "Published." : status === "draft" ? "Unpublished." : "Archived." };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
async function slugOf(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  return (data as { slug: string } | null)?.slug ?? null;
}

export async function uploadProductImagesAction(productId: string, formData: FormData): Promise<ActionResult<{ uploaded: number }>> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  if (!z.uuid().safeParse(productId).success) return { ok: false, error: "Invalid product." };
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Choose at least one image." };
  if (files.length > 10) return { ok: false, error: "Upload at most 10 images at a time." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let position = ((last as { position: number } | null)?.position ?? -1) + 1;
  const productName = (await supabase.from("products").select("name").eq("id", productId).single()).data?.name as string | undefined;

  const errors: string[] = [];
  let uploaded = 0;
  for (const file of files) {
    const result = await uploadImage(supabase, file, `products/${productId}`);
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }
    const { error } = await supabase
      .from("product_images")
      .insert({ product_id: productId, url: result.url, storage_path: result.path, alt: productName ?? null, position: position++ });
    if (error) {
      await removeImage(supabase, result.path);
      errors.push(`${file.name} could not be saved.`);
      continue;
    }
    uploaded++;
  }
  invalidateCatalog(await slugOf(productId));
  if (uploaded === 0) return { ok: false, error: errors.join(" ") || "Upload failed." };
  return { ok: true, data: { uploaded }, message: errors.length ? `Uploaded ${uploaded}. ${errors.join(" ")}` : `Uploaded ${uploaded} image${uploaded === 1 ? "" : "s"}.` };
}

export async function updateImageAltAction(imageId: string, alt: string): Promise<ActionResult> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  const parsed = z.object({ id: z.uuid(), alt: z.string().trim().max(200) }).safeParse({ id: imageId, alt });
  if (!parsed.success) return { ok: false, error: "Alt text must be 200 characters or fewer." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .update({ alt: parsed.data.alt || null })
    .eq("id", imageId)
    .select("product_id")
    .single();
  if (error) return fail(error, "admin.image.alt");
  invalidateCatalog(await slugOf((data as { product_id: string }).product_id));
  return { ok: true, data: undefined, message: "Alt text saved." };
}

export async function moveImageAction(imageId: string, direction: "up" | "down"): Promise<ActionResult> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  if (!z.uuid().safeParse(imageId).success) return { ok: false, error: "Invalid image." };
  const supabase = await createClient();
  const { data: image } = await supabase.from("product_images").select("product_id").eq("id", imageId).maybeSingle();
  if (!image) return { ok: false, error: "Image not found." };
  const productId = (image as { product_id: string }).product_id;
  const { data: all } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .order("position")
    .order("created_at");
  const ids = ((all ?? []) as { id: string }[]).map((r) => r.id);
  const index = ids.indexOf(imageId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return { ok: true, data: undefined };
  [ids[index], ids[target]] = [ids[target], ids[index]];
  for (const [position, id] of ids.entries()) {
    const { error } = await supabase.from("product_images").update({ position }).eq("id", id);
    if (error) return fail(error, "admin.image.move");
  }
  invalidateCatalog(await slugOf(productId));
  return { ok: true, data: undefined, message: "Order updated." };
}

export async function deleteImageAction(imageId: string): Promise<ActionResult> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  if (!z.uuid().safeParse(imageId).success) return { ok: false, error: "Invalid image." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .select("product_id, storage_path")
    .single();
  if (error) return fail(error, "admin.image.delete");
  const row = data as { product_id: string; storage_path: string | null };
  await removeImage(supabase, row.storage_path);
  invalidateCatalog(await slugOf(row.product_id));
  return { ok: true, data: undefined, message: "Image removed." };
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
const adjustSchema = z.object({
  variantId: z.uuid(),
  change: z.coerce.number().int().refine((n) => n !== 0, "Enter a non-zero change.").refine((n) => Math.abs(n) <= 100_000, "Too large."),
  reason: z.enum(["restock", "adjustment"]),
  note: z.string().trim().max(300).optional(),
});

export async function adjustStockAction(input: unknown): Promise<ActionResult<{ stock: number }>> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid adjustment." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_adjust_stock", {
    p_variant_id: parsed.data.variantId,
    p_change: parsed.data.change,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note ?? null,
  });
  if (error) return fail(error, "admin.stock.adjust");
  const { data: v } = await supabase
    .from("product_variants")
    .select("products(slug)")
    .eq("id", parsed.data.variantId)
    .single();
  invalidateCatalog((v as { products?: { slug?: string } } | null)?.products?.slug);
  return { ok: true, data: { stock: Number(data) }, message: `Stock is now ${data}.` };
}
