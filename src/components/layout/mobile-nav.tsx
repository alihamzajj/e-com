"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";

type Props = { links: { href: string; label: string }[]; storeName: string };

export function MobileNav({ links, storeName }: Props) {
  const [open, setOpen] = useState(false);
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
          {[...links, { href: "/account", label: "Account" }, { href: "/cart", label: "Cart" }].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-sm px-3 py-3 text-[15px] font-medium text-ink hover:bg-surface"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Dialog>
  );
}
