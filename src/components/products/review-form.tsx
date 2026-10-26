"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { submitReviewAction } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

const MAX_PHOTOS = 4;
const MAX_SIDE = 1600;

/**
 * Scales a photo down to at most 1600 px on its longest side and re-encodes it
 * as JPEG, so phone pictures upload quickly and four fit in one request.
 */
async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("encode");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

type Photo = { file: File; preview: string };

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);

  // Free the preview URLs when the form goes away.
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function addPhotos(list: FileList | null) {
    const picked = [...(list ?? [])].slice(0, MAX_PHOTOS - photos.length);
    if (!picked.length) return;
    setPreparing(true);
    setError(null);
    const added: Photo[] = [];
    for (const file of picked) {
      try {
        const small = await shrinkPhoto(file);
        const preview = URL.createObjectURL(small);
        previews.current.push(preview);
        added.push({ file: small, preview });
      } catch {
        setError(`${file.name} could not be read. Try a JPEG or PNG photo.`);
      }
    }
    setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
    setPreparing(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <form
      className="space-y-4 rounded-lg bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating < 1) {
          setError("Choose a rating.");
          return;
        }
        const data = new FormData();
        data.set("productId", productId);
        data.set("rating", String(rating));
        data.set("title", title);
        data.set("body", body);
        for (const p of photos) data.append("photos", p.file);
        startTransition(async () => {
          const result = await submitReviewAction(data);
          if (result.ok) {
            toast.success(result.message ?? "Review saved.");
            setError(null);
            setPhotos([]);
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

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Photos (optional)</legend>
        <p className="mb-2 text-xs text-muted">Add up to {MAX_PHOTOS} photos of the product you received.</p>
        <ul className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <li key={p.preview} className="relative size-20 overflow-hidden rounded-md ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={p.preview} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setPhotos((list) => list.filter((x) => x !== p))}
                className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-ink/75 text-white hover:bg-ink"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <li>
              <label
                className={cn(
                  "flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line bg-card text-[11px] text-muted hover:border-ink/40 hover:text-ink focus-within:outline-2 focus-within:outline-accent",
                  preparing && "pointer-events-none opacity-60",
                )}
              >
                <ImagePlus className="size-5" aria-hidden />
                {preparing ? "Adding…" : "Add photos"}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => void addPhotos(e.target.files)}
                />
              </label>
            </li>
          ) : null}
        </ul>
      </fieldset>

      <FormError message={error} />
      <Button type="submit" variant="dark" loading={pending} disabled={preparing}>
        Submit review
      </Button>
    </form>
  );
}
