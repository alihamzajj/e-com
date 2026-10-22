"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { publicEnv } from "@/lib/config/public";
import { fail, logServerError, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";
import { getStoreSettings } from "@/features/settings/queries";
import { sendEmail } from "@/lib/email/send";
import { questionAnsweredEmail } from "@/lib/email/templates";

const id = z.uuid();
const body = (max: number) => z.string().trim().min(1, "Write something first.").max(max);

async function questionProduct(questionId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("product_questions").select("product_id").eq("id", questionId).maybeSingle();
  return (data as { product_id: string } | null)?.product_id ?? null;
}

function invalidateQuestions(productId: string | null) {
  if (productId) updateTag(`questions:${productId}`);
}

async function emailAsker(questionId: string, answer: string) {
  if (!isServiceRoleConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("product_questions")
      .select("body, user_id, products(name, slug)")
      .eq("id", questionId)
      .single();
    const q = data as { body: string; user_id: string | null; products: { name: string; slug: string } | null } | null;
    if (!q?.user_id || !q.products) return;
    const { data: profile } = await admin.from("profiles").select("email").eq("id", q.user_id).single();
    const email = (profile as { email: string | null } | null)?.email;
    if (!email) return;
    const settings = await getStoreSettings();
    const mail = questionAnsweredEmail(settings, q.products.name, q.body, answer, `${publicEnv.siteUrl}/products/${q.products.slug}#questions`);
    await sendEmail({ to: email, ...mail, template: "question_answered" });
  } catch (error) {
    logServerError("notify.question_answered", error);
  }
}

export async function answerQuestionAction(questionId: string, text: string): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  const parsed = z.object({ questionId: id, text: body(3000) }).safeParse({ questionId, text });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid answer." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_question", { p_question_id: questionId, p_body: parsed.data.text });
  if (error) return fail(error, "admin.question.answer");
  invalidateQuestions(await questionProduct(questionId));
  after(() => emailAsker(questionId, parsed.data.text));
  return { ok: true, data: undefined, message: "Answer published." };
}

export async function updateAnswerAction(answerId: string, text: string): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  const parsed = z.object({ answerId: id, text: body(3000) }).safeParse({ answerId, text });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid answer." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_answers").update({ body: parsed.data.text }).eq("id", answerId).select("question_id").single();
  if (error) return fail(error, "admin.answer.update");
  invalidateQuestions(await questionProduct((data as { question_id: string }).question_id));
  return { ok: true, data: undefined, message: "Answer updated." };
}

export async function deleteAnswerAction(answerId: string): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  if (!id.safeParse(answerId).success) return { ok: false, error: "Invalid answer." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_answers").delete().eq("id", answerId).select("question_id").single();
  if (error) return fail(error, "admin.answer.delete");
  const questionId = (data as { question_id: string }).question_id;
  const { count } = await supabase.from("product_answers").select("id", { count: "exact", head: true }).eq("question_id", questionId);
  if ((count ?? 0) === 0) {
    // Back to the unanswered queue so it is not public without an answer.
    await supabase.rpc("moderate_question", { p_question_id: questionId, p_status: "pending" });
  }
  invalidateQuestions(await questionProduct(questionId));
  return { ok: true, data: undefined, message: "Answer deleted." };
}

export async function moderateQuestionAction(questionId: string, status: "pending" | "answered" | "hidden" | "spam"): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  const parsed = z.object({ questionId: id, status: z.enum(["pending", "answered", "hidden", "spam"]) }).safeParse({ questionId, status });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_question", { p_question_id: questionId, p_status: status });
  if (error) return fail(error, "admin.question.moderate");
  invalidateQuestions(await questionProduct(questionId));
  const labels = { pending: "Moved to unanswered.", answered: "Marked as answered.", hidden: "Question hidden.", spam: "Marked as spam." };
  return { ok: true, data: undefined, message: labels[status] };
}

export async function editQuestionAction(questionId: string, text: string): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  const parsed = z.object({ questionId: id, text: z.string().trim().min(5, "At least 5 characters.").max(1000) }).safeParse({ questionId, text });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid question." };
  const supabase = await createClient();
  const { error } = await supabase.from("product_questions").update({ body: parsed.data.text }).eq("id", questionId);
  if (error) return fail(error, "admin.question.edit");
  invalidateQuestions(await questionProduct(questionId));
  return { ok: true, data: undefined, message: "Question updated." };
}

export async function deleteQuestionAction(questionId: string): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  if (!id.safeParse(questionId).success) return { ok: false, error: "Invalid question." };
  const productId = await questionProduct(questionId);
  const supabase = await createClient();
  const { error } = await supabase.from("product_questions").delete().eq("id", questionId);
  if (error) return fail(error, "admin.question.delete");
  invalidateQuestions(productId);
  return { ok: true, data: undefined, message: "Question deleted." };
}

export async function moderateReviewAction(reviewId: string, status: "published" | "hidden"): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  const parsed = z.object({ reviewId: id, status: z.enum(["published", "hidden"]) }).safeParse({ reviewId, status });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_review", { p_review_id: reviewId, p_status: status });
  if (error) return fail(error, "admin.review.moderate");
  const { data } = await supabase.from("reviews").select("product_id, products(slug)").eq("id", reviewId).maybeSingle();
  const r = data as { product_id: string; products: { slug: string } | null } | null;
  if (r) {
    updateTag(`reviews:${r.product_id}`);
    updateTag("products"); // rating aggregates on cards
    if (r.products?.slug) updateTag(`product:${r.products.slug}`);
  }
  return { ok: true, data: undefined, message: status === "hidden" ? "Review hidden." : "Review published." };
}

export async function resolveReportAction(reportId: string, status: "resolved" | "dismissed"): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  const parsed = z.object({ reportId: id, status: z.enum(["resolved", "dismissed"]) }).safeParse({ reportId, status });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").update({ status }).eq("id", reportId);
  if (error) return fail(error, "admin.report.resolve");
  return { ok: true, data: undefined, message: status === "dismissed" ? "Report dismissed." : "Report resolved." };
}
