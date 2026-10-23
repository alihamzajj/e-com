import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div data-reveal className="flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 id={id} className="display text-[clamp(2rem,4.5vw,3.5rem)] text-ink">
          {title}
        </h2>
      </div>
      {href ? (
        <Link href={href} className="tap inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink hover:text-accent-strong">
          {linkLabel ?? "View all"} <ArrowRight className="nudge size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
