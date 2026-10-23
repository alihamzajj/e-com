import Link from "next/link";
import { Suspense } from "react";
import { Phone, ShoppingBag, User } from "lucide-react";
import { getStoreSettings } from "@/features/settings/queries";
import { getCategories } from "@/features/catalog/queries";
import { getCartCount } from "@/features/cart/server";
import { getSessionUser } from "@/lib/auth/session";
import { SearchDialog } from "./search-dialog";
import { MobileNav } from "./mobile-nav";
import { Logo } from "./logo";

const iconButton =
  "relative inline-flex size-10 items-center justify-center rounded-sm text-ink transition-colors hover:bg-ink/5 [&_svg]:size-[18px]";

export async function Header() {
  const [settings, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  const topCategories = categories.filter((c) => !c.parent_id).slice(0, 3);
  const nav = [
    { href: "/products", label: "Shop" },
    ...topCategories.map((c) => ({ href: `/categories/${c.slug}`, label: c.name })),
    { href: "/contact", label: "Support" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="container-page flex h-16 items-center gap-3 md:h-[72px]">
        <MobileNav links={nav} storeName={settings.storeName} />
        <Logo name={settings.storeName} logoUrl={settings.logoUrl} />
        <nav aria-label="Main" className="mx-auto hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} prefetch className="text-[13px] font-medium text-ink-soft transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-0.5 md:ml-0">
          <SearchDialog />
          <Suspense fallback={<span className={iconButton} aria-hidden><User /></span>}>
            <AccountLink />
          </Suspense>
          <Link href="/cart" className={iconButton} aria-label="Cart">
            <ShoppingBag aria-hidden />
            <Suspense fallback={null}>
              <CartCount />
            </Suspense>
          </Link>
          <Link
            href="/contact"
            className="ml-2 hidden h-9 items-center gap-2 rounded-sm bg-card px-4 text-[13px] font-semibold text-ink shadow-sm ring-1 ring-line-soft transition hover:ring-ink/30 lg:inline-flex"
          >
            Contact Us <Phone className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

async function AccountLink() {
  const user = await getSessionUser();
  return (
    <Link href={user ? "/account" : "/login"} className={iconButton} aria-label={user ? "Your account" : "Sign in"}>
      <User aria-hidden />
      {user ? <span className="absolute top-2 right-2 size-1.5 rounded-full bg-success" aria-hidden /> : null}
    </Link>
  );
}

async function CartCount() {
  const count = await getCartCount();
  if (count === 0) return <span className="sr-only">(empty)</span>;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-[18px] font-bold text-accent-ink">
      <span className="sr-only">, </span>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> items</span>
    </span>
  );
}
