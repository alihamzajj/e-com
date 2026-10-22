"use server";

import { refresh } from "next/cache";
import { questionSchema } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { fail, type ActionResult } from "@/lib/errors";

export async function askQuestionAction(input: { productId: string; body: string; parentId?: string }): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to ask a question." };
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Questions must be between 5 and 1000 characters.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("ask_question", {
    p_product_id: parsed.data.productId,
    p_body: parsed.data.body,
    p_parent_id: parsed.data.parentId ?? null,
  });
  if (error) return fail(error, "questions.ask");
  // New questions are private until answered, so only this visitor's view changes.
  refresh();
  return { ok: true, data: undefined, message: "Question sent. We'll answer it here and email you." };
}
