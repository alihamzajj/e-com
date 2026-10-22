"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils/cn";
import type { ProductImage as Img } from "@/types/domain";

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface ring-1 ring-line-soft">
        <ProductImage
          src={current?.url}
          alt={current?.alt ?? name}
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show image ${i + 1}${img.alt ? `: ${img.alt}` : ""}`}
              onClick={() => setIndex(i)}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden rounded-md bg-surface ring-1 transition",
                i === index ? "ring-2 ring-ink" : "ring-line-soft hover:ring-ink/40",
              )}
            >
              <ProductImage src={img.url} alt="" fill sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
