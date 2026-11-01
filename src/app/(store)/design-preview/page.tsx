import type { Metadata } from "next";
import { getStoreSettings } from "@/features/settings/queries";
import { OrbitHero, getHeroItems, titleLines } from "@/components/store/orbit-hero";
import { SpotlightHero } from "@/components/store/hero-designs/spotlight-hero";
import { BentoHero } from "@/components/store/hero-designs/bento-hero";
import { FanHero } from "@/components/store/hero-designs/fan-hero";

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
    { n: 1, name: "Spotlight", note: "One category at a time, big. Changes every 4 seconds; tabs jump to a category.", hero: <SpotlightHero {...shared} /> },
    { n: 2, name: "Bento", note: "Dark headline card beside a grid of category tiles. Everything visible at once.", hero: <BentoHero {...shared} /> },
    { n: 3, name: "Orange stage", note: "Bold orange banner with a fanned hand of cards. Hover the cards to spread them.", hero: <FanHero {...shared} /> },
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
