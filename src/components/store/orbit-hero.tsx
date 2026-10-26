import Link from "next/link";
import { getCategories, getCategoryPreview } from "@/features/catalog/queries";
import { ProductImage } from "@/components/products/product-image";
import { OrbitStage } from "./orbit-stage";

export type OrbitItem = { slug: string; name: string; eyebrow: string; href: string; image: string | null; label: string };

type Props = {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
};

/** Splits the title into lines: earlier sentences in two halves, the last sentence on its own line in the accent. */
function titleLines(title: string): { text: string; accent: boolean }[] {
  const sentences = title.trim().match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [title];
  if (sentences.length < 2) return [{ text: title, accent: false }];
  const last = sentences.pop()!;
  const lines = sentences.flatMap((s) => {
    const words = s.split(/\s+/);
    if (words.length < 3) return [s];
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
  });
  return [...lines.map((text) => ({ text, accent: false })), { text: last, accent: true }];
}

/**
 * Homepage "Orbit Ring" hero: copy on the left, and on the right one item per
 * main category travelling clockwise round a dashed ring. Each shows the
 * category's picture (set in Admin → Categories) and opens that category's page.
 * The motion is pure CSS (globals.css, "Orbit Ring hero"); OrbitStage only adds
 * the per-count timing and pausing when off screen, hidden or tapped.
 */
export async function OrbitHero({ title, subtitle, ctaLabel, ctaHref }: Props) {
  const categories = (await getCategories()).filter((c) => !c.parent_id);
  // One best seller per category gives the product count (and a picture if the category has none).
  const previews = await Promise.all(categories.map((c) => getCategoryPreview(c.slug, 1)));
  const items: OrbitItem[] = categories.flatMap((c, i) => {
    const top = previews[i][0];
    if (!top) return []; // skip empty categories
    const count = top.total_count;
    return [
      {
        slug: c.slug,
        name: c.name,
        eyebrow: `${count} ${count === 1 ? "product" : "products"}`,
        href: `/categories/${c.slug}`,
        image: c.image_url ?? top.image_url,
        label: `Shop ${c.name}, ${count} ${count === 1 ? "product" : "products"}`,
      },
    ];
  });
  const lines = titleLines(title);

  return (
    <section className="container-page pt-4 md:pt-6">
      <div className="orbit-hero relative overflow-hidden rounded-2xl px-5 pt-12 pb-8 md:px-10 lg:flex lg:items-center lg:gap-6 lg:py-6 xl:px-16">
        <div className="relative z-10 text-center lg:flex-1 lg:text-left">
          <h1 className="display text-[clamp(3rem,13vw,4.75rem)] leading-[0.92] text-ink md:text-[5.5rem] lg:text-[clamp(4.5rem,6.6vw,6.5rem)]">
            {lines.map((line, i) => (
              <span key={i} className="orbit-line-mask">
                <span className={`orbit-rise block${line.accent ? " text-accent" : ""}`} style={{ "--d": `${0.05 + i * 0.1}s` } as React.CSSProperties}>
                  {line.text}
                </span>
              </span>
            ))}
          </h1>
          {subtitle ? (
            <p
              className="orbit-rise mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft lg:mx-0"
              style={{ "--d": `${0.15 + lines.length * 0.1}s` } as React.CSSProperties}
            >
              {subtitle}
            </p>
          ) : null}
          <div className="orbit-rise mt-8" style={{ "--d": `${0.25 + lines.length * 0.1}s` } as React.CSSProperties}>
            <Link
              href={ctaHref}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-[#C2410C] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#9A3412] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {ctaLabel} <span aria-hidden className="orbit-nudge text-lg leading-none">»</span>
            </Link>
          </div>
        </div>

        {items.length > 0 ? (
          <>
            <OrbitStage items={items} />
            {/* Reduced motion: a still, clickable row instead of the orbit. */}
            <ul className="orbit-static mt-10 grid-cols-2 gap-4 sm:grid-cols-3 lg:mt-0 lg:flex-1">
              {items.map((c) => (
                <li key={c.slug}>
                  <Link href={c.href} className="orbit-focus flex flex-col items-center gap-2 rounded-lg p-2 text-center" aria-label={c.label}>
                    <span className="relative block size-24 overflow-hidden rounded-full bg-card ring-1 ring-line-soft">
                      <ProductImage src={c.image} alt="" fill sizes="96px" />
                    </span>
                    <span className="text-sm font-medium text-ink">{c.name}</span>
                    <span className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">{c.eyebrow}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
