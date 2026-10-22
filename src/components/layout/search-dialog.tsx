"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex size-10 items-center justify-center rounded-sm text-ink transition-colors hover:bg-ink/5 [&_svg]:size-[18px]"
        aria-label="Search products"
      >
        <Search aria-hidden />
      </DialogTrigger>
      <DialogContent title="Search the store" className="top-24 translate-y-0">
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            setOpen(false);
            router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
          }}
        >
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <Input
            id="site-search"
            type="search"
            autoFocus
            placeholder="Keyboards, keycaps, switches…"
            value={q}
            maxLength={100}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" variant="dark">
            Search
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
