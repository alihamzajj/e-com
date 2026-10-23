"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export type FilterState = {
  q: string | null;
  category: string | null;
  min: number | null;
  max: number | null;
  sort: string;
  inStock: boolean;
};

type Props = {
  basePath: string;
  state: FilterState;
  categories: { slug: string; name: string }[];
  /** On category pages the category is part of the path, not a filter. */
  lockCategory?: boolean;
  currency: string;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

function buildHref(basePath: string, s: FilterState, lockCategory?: boolean) {
  const qs = new URLSearchParams();
  if (s.q) qs.set("q", s.q);
  if (s.category && !lockCategory) qs.set("category", s.category);
  if (s.min != null) qs.set("min", String(s.min));
  if (s.max != null) qs.set("max", String(s.max));
  if (s.sort && s.sort !== "newest" && !(s.sort === "relevance" && s.q)) qs.set("sort", s.sort);
  if (s.inStock) qs.set("stock", "1");
  const str = qs.toString();
  return str ? `${basePath}?${str}` : basePath;
}

export function SortSelect({ basePath, state, lockCategory }: Pick<Props, "basePath" | "state" | "lockCategory">) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = state.q ? [{ value: "relevance", label: "Best match" }, ...SORT_OPTIONS] : SORT_OPTIONS;
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="sort" className="text-xs text-muted">
        Sort
      </Label>
      <NativeSelect
        id="sort"
        value={state.sort}
        disabled={pending}
        className="h-9 w-auto min-w-44 text-[13px]"
        onChange={(e) => startTransition(() => router.push(buildHref(basePath, { ...state, sort: e.target.value }, lockCategory)))}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function FilterForm({ basePath, state, categories, lockCategory, currency, onDone }: Props & { onDone?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(state.q ?? "");
  const [min, setMin] = useState(state.min?.toString() ?? "");
  const [max, setMax] = useState(state.max?.toString() ?? "");
  const [inStock, setInStock] = useState(state.inStock);
  const [category, setCategory] = useState(state.category);

  const go = (next: Partial<FilterState>) => {
    const parse = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Math.max(0, Number(v)));
    const merged: FilterState = {
      ...state,
      q: q.trim() || null,
      min: parse(min),
      max: parse(max),
      inStock,
      category,
      ...next,
    };
    if (!merged.q && merged.sort === "relevance") merged.sort = "newest";
    startTransition(() => router.push(buildHref(basePath, merged, lockCategory)));
    onDone?.();
  };

  return (
    <form
      className={cn("space-y-7", pending && "opacity-60")}
      onSubmit={(e) => {
        e.preventDefault();
        go({});
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="filter-q">Keyword</Label>
        <Input id="filter-q" type="search" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="Search products" />
      </div>

      {!lockCategory && categories.length > 0 ? (
        <fieldset className="lg:space-y-2">
          <legend className="mb-2 text-sm font-medium">Category</legend>
          {[{ slug: "", name: "All categories" }, ...categories].map((c) => (
            <label key={c.slug || "all"} className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-ink-soft lg:min-h-0">
              <input
                type="radio"
                name="category"
                className="accent-[var(--accent)]"
                checked={(category ?? "") === c.slug}
                onChange={() => {
                  setCategory(c.slug || null);
                  go({ category: c.slug || null });
                }}
              />
              {c.name}
            </label>
          ))}
        </fieldset>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Price ({currency})</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filter-min" className="sr-only">
              Minimum price
            </label>
            <Input id="filter-min" inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div>
            <label htmlFor="filter-max" className="sr-only">
              Maximum price
            </label>
            <Input id="filter-max" inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
        </div>
      </fieldset>

      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm lg:min-h-0">
        <Checkbox checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
        In stock only
      </label>

      <div className="flex gap-2">
        <Button type="submit" variant="dark" className="flex-1" loading={pending}>
          Apply filters
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setQ("");
            setMin("");
            setMax("");
            setInStock(false);
            if (!lockCategory) setCategory(null);
            go({ q: null, min: null, max: null, inStock: false, category: lockCategory ? state.category : null, sort: "newest" });
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}

export function CatalogFilters(props: Props) {
  return (
    <aside aria-label="Filters" className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-24">
        <FilterForm key={JSON.stringify(props.state)} {...props} />
      </div>
    </aside>
  );
}

export function MobileFilters(props: Props) {
  const [open, setOpen] = useState(false);
  const active = [props.state.q, props.state.min, props.state.max, props.state.inStock || null, props.lockCategory ? null : props.state.category].filter(
    (v) => v !== null && v !== undefined,
  ).length;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal aria-hidden /> Filters{active ? ` (${active})` : ""}
        </Button>
      </DialogTrigger>
      <SheetContent title="Filters" side="left">
        <div className="p-5">
          <FilterForm key={JSON.stringify(props.state)} {...props} onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Dialog>
  );
}

export function ActiveFilterChips({ basePath, state, lockCategory, categories, currency }: Props) {
  const chips: { label: string; next: Partial<FilterState> }[] = [];
  if (state.q) chips.push({ label: `“${state.q}”`, next: { q: null, sort: "newest" } });
  if (state.category && !lockCategory)
    chips.push({ label: categories.find((c) => c.slug === state.category)?.name ?? state.category, next: { category: null } });
  if (state.min != null) chips.push({ label: `From ${state.min} ${currency}`, next: { min: null } });
  if (state.max != null) chips.push({ label: `Up to ${state.max} ${currency}`, next: { max: null } });
  if (state.inStock) chips.push({ label: "In stock", next: { inStock: false } });
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.label}>
          <a
            href={buildHref(basePath, { ...state, ...c.next }, lockCategory)}
            className="tap inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line hover:ring-ink/40"
          >
            {c.label} <X className="size-3" aria-label="Remove filter" />
          </a>
        </li>
      ))}
    </ul>
  );
}
