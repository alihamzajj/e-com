"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/account", label: "Profile", icon: UserRound },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
];

// The pathname is request data under Cache Components, so the highlighted nav
// streams in; the fallback renders the same links without the active state.
export function AccountNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && (href === "/account" ? pathname === href : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-ink text-white" : "text-ink-soft hover:bg-card",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        );
      })}
      <form action={signOutAction} className="lg:mt-4">
        <button type="submit" className="inline-flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium text-muted hover:bg-card hover:text-ink">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </form>
    </nav>
  );
}
