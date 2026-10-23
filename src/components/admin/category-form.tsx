"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Checkbox, Field, FormError, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { categorySchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils/format";
import { assignCategoryProductsAction, saveCategoryAction, uploadCategoryImageAction } from "@/actions/admin/categories";

type In = z.input<typeof categorySchema>;
type Out = z.output<typeof categorySchema>;

export function CategoryForm({
  categoryId,
  initial,
  parents,
}: {
  categoryId: string | null;
  initial: In;
  parents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(categoryId));
  const { register, handleSubmit, setValue, formState } = useForm<In, unknown, Out>({
    resolver: zodResolver(categorySchema),
    defaultValues: initial,
  });
  const e = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await saveCategoryAction(categoryId, values);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Saved.");
    if (!categoryId) router.push(`/admin/categories/${result.data.id}`);
    else router.refresh();
  });

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="cat-name" required error={e.name?.message}>
            <Input
              id="cat-name"
              aria-invalid={Boolean(e.name)}
              {...register("name", { onChange: (ev) => !slugTouched && setValue("slug", slugify(ev.target.value)) })}
            />
          </Field>
          <Field label="Slug" htmlFor="cat-slug" required error={e.slug?.message}>
            <Input id="cat-slug" aria-invalid={Boolean(e.slug)} {...register("slug", { onChange: () => setSlugTouched(true) })} />
          </Field>
        </div>
        <Field label="Description" htmlFor="cat-desc" error={e.description?.message}>
          <Textarea id="cat-desc" className="min-h-20" {...register("description")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Parent category" htmlFor="cat-parent">
            <NativeSelect id="cat-parent" {...register("parentId")}>
              <option value="">None (top level)</option>
              {parents.filter((p) => p.id !== categoryId).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Sort order" htmlFor="cat-sort" error={e.sortOrder?.message}>
            <Input id="cat-sort" inputMode="numeric" {...register("sortOrder")} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
            <Checkbox {...register("isVisible")} /> Visible in the store
          </label>
        </div>
        <div>
          <Button type="submit" loading={formState.isSubmitting}>{categoryId ? "Save category" : "Create category"}</Button>
        </div>
      </form>
    </Card>
  );
}

export function CategoryImage({ categoryId, url }: { categoryId: string; url: string | null }) {
  const router = useRouter();
  const ref = React.useRef<HTMLInputElement>(null);
  const [pending, start] = React.useTransition();
  return (
    <div className="flex items-center gap-4">
      <div className="size-24 overflow-hidden rounded-md bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="size-full object-cover" /> : null}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        aria-label="Category image"
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          if (!file) return;
          if (file.size > 4 * 1024 * 1024) return void toast.error("Images must be 4 MB or smaller.");
          const fd = new FormData();
          fd.append("file", file);
          start(async () => {
            const r = await uploadCategoryImageAction(categoryId, fd);
            if (r.ok) toast.success(r.message ?? "Uploaded.");
            else toast.error(r.error);
            router.refresh();
          });
        }}
      />
      <Button type="button" variant="outline" loading={pending} onClick={() => ref.current?.click()}>
        <ImagePlus /> {url ? "Replace image" : "Upload image"}
      </Button>
    </div>
  );
}

export function CategoryProducts({
  categoryId,
  products,
}: {
  categoryId: string;
  products: { id: string; name: string; status: string; categoryName: string | null; inCategory: boolean }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState(() => new Set(products.filter((p) => p.inCategory).map((p) => p.id)));
  const [filter, setFilter] = React.useState("");
  const [pending, start] = React.useTransition();
  const visible = products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="grid gap-3">
      <Input aria-label="Filter products" placeholder="Filter products…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      <ul className="max-h-96 divide-y divide-line-soft overflow-y-auto rounded-md border border-line-soft">
        {visible.map((p) => (
          <li key={p.id}>
            <label className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface">
              <Checkbox
                checked={selected.has(p.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(p.id);
                  else next.delete(p.id);
                  setSelected(next);
                }}
              />
              <span className="flex-1">{p.name}</span>
              <span className="text-xs text-muted">
                {p.inCategory ? "" : p.categoryName ? `in ${p.categoryName}` : "uncategorised"} {p.status !== "active" ? `· ${p.status}` : ""}
              </span>
            </label>
          </li>
        ))}
        {visible.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">No products.</li> : null}
      </ul>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await assignCategoryProductsAction(categoryId, [...selected]);
              if (r.ok) toast.success(r.message ?? "Saved.");
              else toast.error(r.error);
              router.refresh();
            })
          }
        >
          Save assignments
        </Button>
        <span className="text-xs text-muted">{selected.size} selected. Checking a product moves it out of its current category.</span>
      </div>
    </div>
  );
}
