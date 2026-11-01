"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Item = { href: string; label: string };

/**
 * Strip under the header listing every top-level category, so shoppers see the
 * whole range at a glance. Scrolls sideways on narrow screens. The active marker
 * needs the pathname (request data), so it streams in behind Suspense.
 */
export function CategoryBar({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <Suspense fallback={<Bar items={items} pathname={null} />}>
      <ActiveBar items={items} />
    </Suspense>
  );
}

function ActiveBar({ items }: { items: Item[] }) {
  return <Bar items={items} pathname={usePathname()} />;
}

function Bar({ items, pathname }: { items: Item[]; pathname: string | null }) {
  return (
    <nav aria-label="Categories" className="border-t border-line-soft">
      <ul className="container-page flex h-11 items-center gap-1 overflow-x-auto [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
