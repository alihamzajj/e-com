import Link from "next/link";
import { MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { getAnsweredQuestions, getProductReviews } from "@/features/catalog/queries";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RatingStars } from "@/components/ui/rating";
import { formatDate } from "@/lib/utils/format";
import { ReviewForm } from "./review-form";
import { AskQuestionForm, ReportButton } from "./question-forms";

type Base = { productId: string; productSlug: string; timezone: string };

export async function ReviewsSection({ productId, productSlug, timezone, ratingAvg, ratingCount }: Base & { ratingAvg: number; ratingCount: number }) {
  const [reviews, user] = await Promise.all([getProductReviews(productId), getSessionUser()]);
  let canReview = false;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("can_review_product", { p_product_id: productId });
    canReview = data === true;
  }
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        {ratingCount > 0 ? (
          <>
            <p className="display text-6xl">{ratingAvg.toFixed(1)}</p>
            <RatingStars value={ratingAvg} size={18} />
            <p className="text-sm text-muted">Based on {ratingCount} verified review{ratingCount === 1 ? "" : "s"}</p>
            <ul className="space-y-1.5" aria-label="Rating distribution">
              {distribution.map((d) => (
                <li key={d.star} className="flex items-center gap-2 text-xs text-muted">
                  <span className="w-3">{d.star}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                    <span className="block h-full bg-accent" style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }} />
                  </span>
                  <span className="w-6 text-right tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">No reviews yet.</p>
        )}
        <p className="flex items-start gap-2 text-xs text-muted">
          <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
          Only customers with a delivered order can review.
        </p>
      </div>
      <div className="space-y-6">
        {canReview ? <ReviewForm productId={productId} /> : null}
        {!user ? (
          <p className="text-sm text-muted">
            <Link href={`/login?next=/products/${productSlug}%23reviews`} className="font-medium text-ink underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            to review a product you have received.
          </p>
        ) : null}
        {reviews.length > 0 ? (
          <ul className="divide-y divide-line-soft">
            {reviews.map((r) => (
              <li key={r.id} className="space-y-2 py-5 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <RatingStars value={r.rating} />
                  <ReportButton targetType="review" targetId={r.id} />
                </div>
                {r.title ? <p className="font-semibold">{r.title}</p> : null}
                {r.body ? <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">{r.body}</p> : null}
                <p className="text-xs text-muted">
                  {r.author_name} · Verified buyer · {formatDate(r.created_at, timezone)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export async function QuestionsSection({ productId, productSlug, timezone }: Base) {
  const [questions, user] = await Promise.all([getAnsweredQuestions(productId), getSessionUser()]);
  let pending: { id: string; body: string; created_at: string; parent_id: string | null }[] = [];
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("product_questions")
      .select("id, body, created_at, parent_id")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pending = (data ?? []) as typeof pending;
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <p className="text-sm text-muted">Questions are answered by our team and published here once answered.</p>
        {user ? (
          <AskQuestionForm productId={productId} />
        ) : (
          <p className="text-sm">
            <Link href={`/login?next=/products/${productSlug}%23questions`} className="font-medium underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            to ask a question.
          </p>
        )}
      </div>
      <div className="space-y-4">
        {pending.length > 0 ? (
          <ul className="space-y-2" aria-label="Your questions awaiting an answer">
            {pending.map((q) => (
              <li key={q.id} className="rounded-md bg-warning-soft/60 px-4 py-3 text-sm">
                <p className="font-medium">{q.body}</p>
                <p className="mt-1 text-xs text-warning">Awaiting an answer · only visible to you</p>
              </li>
            ))}
          </ul>
        ) : null}
        {questions.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface px-5 py-6 text-sm text-muted">
            <MessageCircleQuestion className="size-5" aria-hidden /> No answered questions yet. Be the first to ask.
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {questions.map((q) => (
              <li key={q.id} className="space-y-3 py-5 first:pt-0">
                <QuestionBlock question={q} timezone={timezone} />
                {q.followUps.map((f) => (
                  <div key={f.id} className="ml-5 border-l-2 border-line-soft pl-4">
                    <QuestionBlock question={f} timezone={timezone} />
                  </div>
                ))}
                {user ? (
                  <div className="ml-5">
                    <AskQuestionForm productId={productId} parentId={q.id} compact />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({
  question,
  timezone,
}: {
  question: { id: string; author_name: string; body: string; created_at: string; answers: { id: string; author_name: string; body: string }[] };
  timezone: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">
          <span className="mr-1.5 text-accent">Q.</span>
          {question.body}
        </p>
        <ReportButton targetType="question" targetId={question.id} />
      </div>
      <p className="text-xs text-muted">
        {question.author_name} · {formatDate(question.created_at, timezone)}
      </p>
      {question.answers.map((a) => (
        <div key={a.id} className="rounded-md bg-surface px-4 py-3 text-sm leading-relaxed">
          <span className="mr-1.5 font-semibold">A.</span>
          <span className="whitespace-pre-line text-ink-soft">{a.body}</span>
          <p className="mt-1 text-xs text-muted">{a.author_name}</p>
        </div>
      ))}
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="skeleton h-5 w-1/3 rounded" />
      <div className="skeleton h-20 rounded" />
      <div className="skeleton h-20 rounded" />
    </div>
  );
}
