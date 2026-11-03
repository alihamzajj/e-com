"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Input } from "@/components/ui/form-controls";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { saveOrbitProductsAction } from "@/actions/admin/homepage";
import { ORBIT_MAX, ORBIT_MIN, ORBIT_OUTER } from "@/features/catalog/home-orbit";

export type PickerProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  salePrice: number | null;
  image: string | null;
};

type Props = { products: PickerProduct[]; initialIds: string[]; currency: string; locale: string };

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="size-11 shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-line-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="size-full object-cover" loading="lazy" /> : null}
    </span>
  );
}

export function OrbitPicker({ products, initialIds, currency, locale }: Props) {
  const router = useRouter();
  const [ids, setIds] = React.useState(initialIds);
  const [query, setQuery] = React.useState("");
  const [pending, start] = React.useTransition();
  const byId = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const dirty = ids.join() !== initialIds.join();
  const full = ids.length >= ORBIT_MAX;

  const money = (p: PickerProduct) => formatMoney(p.salePrice ?? p.price, currency, locale);
  const move = (i: number, by: number) =>
    setIds((list) => {
      const next = [...list];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  const q = query.trim().toLowerCase();
  const available = products.filter(
    (p) => !ids.includes(p.id) && (!q || p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)),
  );

  const save = () =>
    start(async () => {
      const r = await saveOrbitProductsAction(ids);
      if (r.ok) {
        toast.success(r.message ?? "Saved.");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="grid gap-5">
      <Card className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              In the orbit <span className="font-normal text-muted">({ids.length} of {ORBIT_MAX})</span>
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-muted">
              The first {ORBIT_OUTER} go on the big outer ring, the rest on the small inner ring. The centre circle shows each one in
              turn with its price. Use the arrows to change the order.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/" target="_blank"><ExternalLink /> View homepage</Link>
          </Button>
        </div>

        {ids.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No products picked yet, so the homepage shows your categories instead. Add at least {ORBIT_MIN} below.
          </p>
        ) : (
          <ol className="grid gap-2">
            {ids.map((id, i) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <li key={id} className="flex items-center gap-3 rounded-md border border-line-soft px-3 py-2">
                  <span className="w-5 text-center text-xs font-semibold text-muted tabular-nums">{i + 1}</span>
                  <Thumb src={p.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted">
                      {money(p)} · {i < ORBIT_OUTER ? "Outer ring" : "Inner ring"}
                      {p.category ? ` · ${p.category}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${p.name} down`} disabled={i === ids.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${p.name}`} onClick={() => setIds((l) => l.filter((x) => x !== id))}>
                      <X />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {ids.length > 0 && ids.length < ORBIT_MIN ? (
          <p role="status" className="text-xs text-warning">
            Add {ORBIT_MIN - ids.length} more — the orbit needs at least {ORBIT_MIN} products, so the homepage keeps showing categories until then.
          </p>
        ) : null}
      </Card>

      <Card className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Add products</h2>
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or category" className="h-9 pl-9" />
          </label>
        </div>
        {full ? <p className="text-xs text-muted">The orbit is full. Remove a product to add another.</p> : null}
        {available.length === 0 ? (
          <p className="text-sm text-muted">{products.length === 0 ? "No active products yet. Publish a product first." : "No more products match."}</p>
        ) : (
          <ul className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {available.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => setIds((l) => [...l, p.id])}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border border-line-soft px-3 py-2 text-left transition-colors hover:border-ink/30 hover:bg-surface",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <Thumb src={p.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted">{money(p)}{p.category ? ` · ${p.category}` : ""}</span>
                  </span>
                  <Plus className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="sr-only">Add {p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">To change a price, edit the product — the homepage updates with it.</p>
      </Card>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3">
        {dirty ? (
          <span className="rounded-full border border-line-soft bg-card px-3 py-1 text-xs text-muted shadow-[var(--shadow-pop)]">Unsaved changes</span>
        ) : null}
        <Button type="button" size="lg" loading={pending} disabled={!dirty} onClick={save} className="shadow-[var(--shadow-pop)]">
          Save homepage
        </Button>
      </div>
    </div>
  );
}
