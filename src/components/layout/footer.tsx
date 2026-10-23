import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getStoreSettings } from "@/features/settings/queries";
import { getCategories } from "@/features/catalog/queries";
import { Logo } from "./logo";

const POLICY_LINKS = [
  { slug: "shipping", label: "Shipping" },
  { slug: "returns", label: "Returns" },
  { slug: "privacy", label: "Privacy" },
  { slug: "terms", label: "Terms" },
];

export async function Footer() {
  const [settings, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  const policies = POLICY_LINKS.filter((p) => settings.policies[p.slug]);
  const social = Object.entries(settings.socialLinks).filter(([, url]) => typeof url === "string" && /^https?:\/\//.test(url));

  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo name={settings.storeName} logoUrl={settings.logoUrl} tone="light" />
          {settings.tagline ? <p className="max-w-xs text-sm text-white/60">{settings.tagline}</p> : null}
          <ul className="text-sm text-white/70">
            {settings.contactEmail ? (
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-accent" aria-hidden />
                <a href={`mailto:${settings.contactEmail}`} className="inline-flex min-h-10 items-center hover:text-white">
                  {settings.contactEmail}
                </a>
              </li>
            ) : null}
            {settings.contactPhone ? (
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-accent" aria-hidden />
                <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="inline-flex min-h-10 items-center hover:text-white">
                  {settings.contactPhone}
                </a>
              </li>
            ) : null}
            {settings.contactAddress ? (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-accent" aria-hidden />
                {settings.contactAddress}
              </li>
            ) : null}
          </ul>
        </div>
        <FooterColumn
          title="Shop"
          links={[{ href: "/products", label: "All products" }, ...categories.slice(0, 5).map((c) => ({ href: `/categories/${c.slug}`, label: c.name }))]}
        />
        <FooterColumn
          title="Help"
          links={[
            { href: "/contact", label: "Contact support" },
            { href: "/account/orders", label: "Track an order" },
            { href: "/account", label: "Your account" },
            { href: "/cart", label: "Cart" },
          ]}
        />
        <FooterColumn
          title="Policies"
          links={[
            ...policies.map((p) => ({ href: `/policies/${p.slug}`, label: p.label })),
            ...social.map(([name, url]) => ({ href: url, label: name.charAt(0).toUpperCase() + name.slice(1), external: true })),
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-white/50">
          <p>
            © {settings.storeName}. All prices in {settings.currency}.
          </p>
          <p>{settings.codEnabled ? "Cash on delivery available" : null}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string; external?: boolean }[] }) {
  if (links.length === 0) return <div />;
  return (
    <div>
      <p className="mb-4 text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">{title}</p>
      <ul className="text-sm">
        {links.map((l) => (
          <li key={l.href}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-white/75 hover:text-white">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="inline-flex min-h-10 items-center text-white/75 hover:text-white">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
