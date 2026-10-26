"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MegaPanel, type MegaCategory } from "./mega-panel";

type NavLink = { href: string; label: string };
type Pill = { left: number; width: number; visible: boolean };
type Props = { links: NavLink[]; mega: MegaCategory[] };

/**
 * Main navigation: a "Shop" button that opens the category mega menu, then plain
 * links. A pill glides under the hovered (or focused) item, and an orange dot sits
 * under the current page. The pathname is request data under Cache Components, so
 * the active marker streams in behind Suspense.
 */
export function NavLinks(props: Props) {
  return (
    <Suspense fallback={<NavLinksInner {...props} pathname={null} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

function ActiveNavLinks(props: Props) {
  return <NavLinksInner {...props} pathname={usePathname()} />;
}

function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  return href === "/products" ? pathname === "/products" || pathname.startsWith("/products/") : pathname.startsWith(href);
}

const itemClass = "relative z-10 rounded-full px-3 py-2 text-[13px] lg:px-4 font-medium transition-colors duration-200 focus-visible:outline-none";

function NavLinksInner({ links, mega, pathname }: Props & { pathname: string | null }) {
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number>(undefined);
  const panelId = useId();
  const [pill, setPill] = useState<Pill>({ left: 0, width: 0, visible: false });
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const moveTo = (el: HTMLElement, key: string) => {
    const list = listRef.current;
    if (!list) return;
    const a = el.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    setPill({ left: a.left - b.left, width: a.width, visible: true });
    setHovered(key);
  };
  const hide = () => {
    setPill((p) => ({ ...p, visible: false }));
    setHovered(null);
  };

  // Hover opens at once; leaving waits a moment so the pointer can cross the gap into the panel.
  const keepOpen = () => window.clearTimeout(closeTimer.current);
  const closeSoon = () => {
    keepOpen();
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };
  const close = (refocus: boolean) => {
    keepOpen();
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => keepOpen, []);
  // Close when navigating (adjusted during render, not in an effect)…
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  // …and on a click anywhere outside the header.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest("header")) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const shopActive = isActive("/products", pathname) || (pathname?.startsWith("/categories/") ?? false);

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
        {mega.length > 0 ? (
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            onPointerEnter={(e) => {
              moveTo(e.currentTarget, "shop");
              if (e.pointerType === "mouse") {
                keepOpen();
                setOpen(true);
              }
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") closeSoon();
            }}
            onFocus={(e) => moveTo(e.currentTarget, "shop")}
            onBlur={hide}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                // Render the panel (no longer inert) before moving focus into it.
                flushSync(() => setOpen(true));
                document.getElementById(panelId)?.querySelector<HTMLElement>("a")?.focus();
              }
              if (e.key === "Escape") close(false);
            }}
            className={cn(itemClass, "inline-flex items-center gap-1", hovered === "shop" || open || shopActive ? "text-ink" : "text-ink-soft")}
          >
            Shop
            <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
            <span
              aria-hidden
              className={cn(
                "absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent transition-transform duration-300",
                shopActive ? "scale-100" : "scale-0",
              )}
            />
          </button>
        ) : null}
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
              className={cn(itemClass, hovered === item.href || active ? "text-ink" : "text-ink-soft")}
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
      {mega.length > 0 ? (
        <MegaPanel id={panelId} open={open} categories={mega} onClose={close} onPointerEnter={keepOpen} onPointerLeave={closeSoon} />
      ) : null}
    </nav>
  );
}
