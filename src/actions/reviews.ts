"use server";

import { updateTag } from "next/cache";
import { reportSchema, reviewSchema } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { fail, type ActionResult } from "@/lib/errors";
import { removeImage, uploadImage } from "@/lib/storage/upload";

const MAX_REVIEW_PHOTOS = 4;

/**
 * Saves a review from FormData (productId, rating, title, body, photos[]).
 * Photos are uploaded to the buyer's own reviews/<user_id>/ folder first; when
 * any are sent they replace the review's previous photos, which are then removed.
 */
export async function submitReviewAction(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to leave a review." };
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? undefined,
    body: formData.get("body") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please check your review.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_REVIEW_PHOTOS) return { ok: false, error: `You can add up to ${MAX_REVIEW_PHOTOS} photos.` };

  const supabase = await createClient();
  // Check eligibility before storing any files.
  const { data: eligible } = await supabase.rpc("can_review_product", { p_product_id: parsed.data.productId });
  if (eligible !== true) return { ok: false, error: "You can review products from delivered orders." };

  const uploaded: string[] = [];
  for (const file of files) {
    const result = await uploadImage(supabase, file, `reviews/${user.id}`);
    if (!result.ok) {
      for (const path of uploaded) await removeImage(supabase, path);
      return { ok: false, error: result.error };
    }
    uploaded.push(result.path);
  }

  const { data: previous } = files.length
    ? await supabase.from("reviews").select("photos").eq("product_id", parsed.data.productId).eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { error } = await supabase.rpc("submit_review", {
    p_product_id: parsed.data.productId,
    p_rating: parsed.data.rating,
    p_title: parsed.data.title ?? "",
    p_body: parsed.data.body ?? "",
    // No new photos keeps the ones already on the review.
    p_photos: files.length ? uploaded : null,
  });
  if (error) {
    for (const path of uploaded) await removeImage(supabase, path);
    return fail(error, "reviews.submit");
  }
  for (const path of ((previous as { photos: string[] } | null)?.photos ?? [])) await removeImage(supabase, path);
  updateTag(`reviews:${parsed.data.productId}`);
  updateTag("reviews");
  updateTag("products");
  return { ok: true, data: undefined, message: "Thanks — your review is live." };
}

export async function reportContentAction(input: { targetType: "question" | "review"; targetId: string; reason: string }): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to report content." };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Tell us briefly what is wrong (at least 3 characters)." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_content", {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_reason: parsed.data.reason,
  });
  if (error) return fail(error, "reviews.report");
  return { ok: true, data: undefined, message: "Thanks — our team will take a look." };
}
