import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  page: number;
  pageCount: number;
  /** Builds the href for a page number, preserving other query params. */
  hrefFor: (page: number) => string;
  className?: string;
};

function pagesToShow(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageCount, hrefFor, className }: Props) {
  if (pageCount <= 1) return null;
  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-sm";
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "hover:bg-card")} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-subtle")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pagesToShow(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className={cn(item, "text-subtle")}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "bg-ink text-white" : "hover:bg-card")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "hover:bg-card")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-subtle")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
