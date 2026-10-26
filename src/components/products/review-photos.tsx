"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProductImage } from "./product-image";

/** Thumbnails of a buyer's review photos; tapping one opens it full size. */
export function ReviewPhotos({ photos, author }: { photos: string[]; author: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;
  const step = (d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label={`Photos from ${author}`}>
        {photos.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`View photo ${i + 1} of ${photos.length} from ${author}`}
              className="relative block size-20 overflow-hidden rounded-md bg-card ring-1 ring-line-soft transition hover:ring-ink/40 sm:size-24"
            >
              <ProductImage src={url} alt="" fill sizes="96px" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open !== null ? (
          <DialogContent title={`Photo ${open + 1} of ${photos.length} from ${author}`} className="max-w-2xl">
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-surface">
              <ProductImage src={photos[open]} alt={`Customer photo ${open + 1} from ${author}`} fill sizes="(min-width: 768px) 640px, 100vw" className="object-contain" />
            </div>
            {photos.length > 1 ? (
              <div className="mt-3 flex justify-between">
                <button type="button" onClick={() => step(-1)} className="inline-flex h-10 items-center gap-1 rounded-sm px-3 text-sm hover:bg-ink/5">
                  <ChevronLeft className="size-4" aria-hidden /> Previous
                </button>
                <button type="button" onClick={() => step(1)} className="inline-flex h-10 items-center gap-1 rounded-sm px-3 text-sm hover:bg-ink/5">
                  Next <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
