"use server";

import { updateTag } from "next/cache";
import { reportSchema, reviewSchema } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { fail, type ActionResult } from "@/lib/errors";

export async function submitReviewAction(input: {
  productId: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to leave a review." };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check your review.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_product_id: parsed.data.productId,
    p_rating: parsed.data.rating,
    p_title: parsed.data.title ?? "",
    p_body: parsed.data.body ?? "",
  });
  if (error) return fail(error, "reviews.submit");
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
