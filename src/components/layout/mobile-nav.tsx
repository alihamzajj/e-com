"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import type { MegaCategory } from "./mega-panel";

type Props = { links: { href: string; label: string }[]; categories: MegaCategory[]; storeName: string };

const rowClass = "rounded-sm px-3 py-3 text-[15px] font-medium text-ink hover:bg-surface";

export function MobileNav({ links, categories, storeName }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex size-10 items-center justify-center rounded-sm hover:bg-ink/5 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden />
      </DialogTrigger>
      <SheetContent title={storeName} side="left">
        <nav aria-label="Mobile" className="flex flex-col p-3">
          {/* Categories open in place to show their subcategories. */}
          {categories.map((c) =>
            c.subs.length > 0 ? (
              <details key={c.slug} className="group">
                <summary className={`${rowClass} flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden`}>
                  {c.name}
                  <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="mb-2 ml-3 border-l border-line pl-2">
                  {[{ name: `All ${c.name}`, href: c.href }, ...c.subs].map((s) => (
                    <li key={s.href}>
                      <Link prefetch href={s.href} onClick={close} className="block rounded-sm px-3 py-2.5 text-sm text-ink-soft hover:bg-surface">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <Link prefetch key={c.slug} href={c.href} onClick={close} className={rowClass}>
                {c.name}
              </Link>
            ),
          )}
          {categories.length > 0 ? <hr className="my-2 border-line" /> : null}
          {[...links, { href: "/account", label: "Account" }, { href: "/cart", label: "Cart" }].map((l) => (
            <Link prefetch key={l.href} href={l.href} onClick={close} className={rowClass}>
              {l.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Dialog>
  );
}
