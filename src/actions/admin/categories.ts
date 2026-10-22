"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";
import { uploadImage, removeImage, CATALOG_BUCKET } from "@/lib/storage/upload";

function invalidate() {
  updateTag("categories");
  updateTag("products");
}

export async function saveCategoryAction(categoryId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const c = parsed.data;
  if (categoryId && c.parentId === categoryId) return { ok: false, error: "A category cannot be its own parent." };
  const supabase = await createClient();

  if (categoryId && c.parentId) {
    // Prevent cycles: walk up from the chosen parent.
    const { data: all } = await supabase.from("categories").select("id, parent_id");
    const parents = new Map(((all ?? []) as { id: string; parent_id: string | null }[]).map((r) => [r.id, r.parent_id]));
    let cursor: string | null | undefined = c.parentId;
    for (let i = 0; cursor && i < 50; i++) {
      if (cursor === categoryId) return { ok: false, error: "That parent would create a loop." };
      cursor = parents.get(cursor);
    }
  }

  const row = {
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    parent_id: c.parentId ?? null,
    is_visible: c.isVisible,
    sort_order: c.sortOrder,
    ...(c.imageUrl !== undefined ? { image_url: c.imageUrl } : {}),
  };
  if (categoryId) {
    const { error } = await supabase.from("categories").update(row).eq("id", categoryId);
    if (error) return fail(error, "admin.category.update");
    invalidate();
    return { ok: true, data: { id: categoryId }, message: "Category saved." };
  }
  const { data, error } = await supabase.from("categories").insert(row).select("id").single();
  if (error) return fail(error, "admin.category.insert");
  invalidate();
  return { ok: true, data: { id: (data as { id: string }).id }, message: "Category created." };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  if (!z.uuid().safeParse(categoryId).success) return { ok: false, error: "Invalid category." };
  const supabase = await createClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", categoryId);
  if ((count ?? 0) > 0) {
    return { ok: false, error: `This category still has ${count} product${count === 1 ? "" : "s"}. Move them or hide the category instead.` };
  }
  const { data, error } = await supabase.from("categories").delete().eq("id", categoryId).select("image_url").single();
  if (error) return fail(error, "admin.category.delete");
  await removeImage(supabase, storagePath((data as { image_url: string | null }).image_url));
  invalidate();
  return { ok: true, data: undefined, message: "Category deleted." };
}

function storagePath(url: string | null): string | null {
  const marker = `/object/public/${CATALOG_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export async function uploadCategoryImageAction(categoryId: string, formData: FormData): Promise<ActionResult<{ url: string }>> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  if (!z.uuid().safeParse(categoryId).success) return { ok: false, error: "Invalid category." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose an image." };
  const supabase = await createClient();
  const { data: before } = await supabase.from("categories").select("image_url").eq("id", categoryId).maybeSingle();
  if (!before) return { ok: false, error: "Category not found." };
  const result = await uploadImage(supabase, file, `categories/${categoryId}`);
  if (!result.ok) return { ok: false, error: result.error };
  const { error } = await supabase.from("categories").update({ image_url: result.url }).eq("id", categoryId);
  if (error) {
    await removeImage(supabase, result.path);
    return fail(error, "admin.category.image");
  }
  await removeImage(supabase, storagePath((before as { image_url: string | null }).image_url));
  invalidate();
  return { ok: true, data: { url: result.url }, message: "Image updated." };
}

export async function assignCategoryProductsAction(categoryId: string, productIds: string[]): Promise<ActionResult> {
  if (!(await actionProfile("products"))) return FORBIDDEN;
  const parsed = z.object({ categoryId: z.uuid(), productIds: z.array(z.uuid()).max(2000) }).safeParse({ categoryId, productIds });
  if (!parsed.success) return { ok: false, error: "Invalid selection." };
  const supabase = await createClient();
  const { data: current } = await supabase.from("products").select("id").eq("category_id", categoryId);
  const selected = new Set(parsed.data.productIds);
  const toRemove = ((current ?? []) as { id: string }[]).map((r) => r.id).filter((id) => !selected.has(id));
  if (toRemove.length) {
    const { error } = await supabase.from("products").update({ category_id: null }).in("id", toRemove);
    if (error) return fail(error, "admin.category.unassign");
  }
  if (selected.size) {
    const { error } = await supabase.from("products").update({ category_id: categoryId }).in("id", [...selected]);
    if (error) return fail(error, "admin.category.assign");
  }
  invalidate();
  return { ok: true, data: undefined, message: "Products updated." };
}
