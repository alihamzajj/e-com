"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavLink = { href: string; label: string };
type Pill = { left: number; width: number; visible: boolean };

/**
 * Main navigation with a pill that glides under the hovered (or focused) link,
 * and an orange dot under the current page. The pathname is request data under
 * Cache Components, so the active marker streams in behind Suspense.
 */
export function NavLinks({ links }: { links: NavLink[] }) {
  return (
    <Suspense fallback={<NavLinksInner links={links} pathname={null} />}>
      <ActiveNavLinks links={links} />
    </Suspense>
  );
}

function ActiveNavLinks({ links }: { links: NavLink[] }) {
  return <NavLinksInner links={links} pathname={usePathname()} />;
}

function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  return href === "/products" ? pathname === "/products" || pathname.startsWith("/products/") : pathname.startsWith(href);
}

function NavLinksInner({ links, pathname }: { links: NavLink[]; pathname: string | null }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<Pill>({ left: 0, width: 0, visible: false });
  const [hovered, setHovered] = useState<string | null>(null);

  const moveTo = (el: HTMLElement, href: string) => {
    const list = listRef.current;
    if (!list) return;
    const a = el.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    setPill({ left: a.left - b.left, width: a.width, visible: true });
    setHovered(href);
  };
  const hide = () => {
    setPill((p) => ({ ...p, visible: false }));
    setHovered(null);
  };

  return (
    <nav aria-label="Main" className="mx-auto hidden md:block">
      <div ref={listRef} className="relative flex items-center gap-1" onMouseLeave={hide}>
        {/* Sliding highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_6px_16px_-8px_rgb(0_0_0/0.25)] ring-1 ring-line-soft transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            width: pill.width,
            transform: `translateX(${pill.left}px) scale(${pill.visible ? 1 : 0.9})`,
            opacity: pill.visible ? 1 : 0,
          }}
        />
        {links.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              onMouseEnter={(e) => moveTo(e.currentTarget, item.href)}
              onFocus={(e) => moveTo(e.currentTarget, item.href)}
              onBlur={hide}
              className={cn(
                "relative z-10 rounded-full px-3 py-2 text-[13px] lg:px-4 font-medium transition-colors duration-200 focus-visible:outline-none",
                hovered === item.href || active ? "text-ink" : "text-ink-soft",
              )}
            >
              {item.label}
              {/* Current page marker */}
              <span
                aria-hidden
                className={cn(
                  "absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent transition-transform duration-300",
                  active ? "scale-100" : "scale-0",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
