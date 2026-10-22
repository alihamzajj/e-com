"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitReviewAction } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-lg bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating < 1) {
          setError("Choose a rating.");
          return;
        }
        startTransition(async () => {
          const result = await submitReviewAction({ productId, rating, title, body });
          if (result.ok) {
            toast.success(result.message ?? "Review saved.");
            setError(null);
          } else setError(result.error);
        });
      }}
    >
      <p className="text-sm font-semibold">Write a review</p>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
              <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
              <Star
                aria-hidden
                className={cn("size-6 transition-colors", (hover || rating) >= n ? "text-accent" : "text-line")}
                fill="currentColor"
                strokeWidth={0}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Title" htmlFor="review-title">
        <Input id="review-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Review" htmlFor="review-body">
        <Textarea id="review-body" maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you like? How do you use it?" />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="dark" loading={pending}>
        Submit review
      </Button>
    </form>
  );
}
