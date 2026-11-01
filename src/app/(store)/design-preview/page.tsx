import type { Metadata } from "next";
import { getStoreSettings } from "@/features/settings/queries";
import { OrbitHero, getHeroItems, titleLines } from "@/components/store/orbit-hero";
import { DialHero } from "@/components/store/hero-designs/dial-hero";
import { BubblesHero } from "@/components/store/hero-designs/bubbles-hero";
import { BloomHero } from "@/components/store/hero-designs/bloom-hero";

export const metadata: Metadata = { title: "Home page designs", robots: { index: false, follow: false } };

/** Side-by-side preview of the home page hero designs, for choosing one. Not linked from the store. */
export default async function DesignPreviewPage() {
  const [settings, items] = await Promise.all([getStoreSettings(), getHeroItems()]);
  const hero = settings.hero;
  const props = {
    title: hero.title || settings.storeName,
    subtitle: hero.subtitle || settings.tagline || undefined,
    ctaLabel: hero.cta_label || "Shop collection",
    ctaHref: hero.cta_href || "/products",
  };
  const shared = { ...props, lines: titleLines(props.title), items };

  const designs = [
    { n: 1, name: "Dial", note: "A wheel of circles turning round a big orange disc on the right. The front circle grows and its name shows.", hero: <DialHero {...shared} /> },
    { n: 2, name: "Bubbles", note: "Headline in the middle, circles of different sizes floating around it. Hover a circle for its name.", hero: <BubblesHero {...shared} /> },
    { n: 3, name: "Bloom", note: "Circles arranged like petals round an orange \"Shop all\" centre, lighting up one after another.", hero: <BloomHero {...shared} /> },
    { n: 0, name: "Current (Orbit Ring)", note: "What the home page uses today, for comparison.", hero: <OrbitHero {...props} /> },
  ];

  return (
    <div className="pb-24">
      {designs.map((d) => (
        <section key={d.name} className="mt-14 first:mt-8">
          <div className="container-page mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="display text-3xl text-ink">
              {d.n ? <span className="text-accent">Design {d.n} · </span> : null}
              {d.name}
            </h2>
            <p className="text-sm text-muted">{d.note}</p>
          </div>
          {d.hero}
        </section>
      ))}
    </div>
  );
}
