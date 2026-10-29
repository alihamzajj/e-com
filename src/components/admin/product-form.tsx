"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Checkbox, Field, FormError, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { productSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils/format";
import { saveProductAction } from "@/actions/admin/products";

export type ProductFormValues = {
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  specifications: { label: string; value: string }[];
  optionNames: { value: string }[];
  price: string;
  salePrice: string;
  costPrice: string;
  status: "draft" | "active" | "archived";
  isFeatured: boolean;
  lowStockThreshold: string;
  variants: {
    id?: string;
    sku: string;
    title: string;
    optionValues: string[];
    price: string;
    salePrice: string;
    stockQuantity: string;
    isActive: boolean;
  }[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  shortDescription: "",
  description: "",
  specifications: [],
  optionNames: [],
  price: "",
  salePrice: "",
  costPrice: "",
  status: "active",
  isFeatured: false,
  lowStockThreshold: "5",
  variants: [{ sku: "", title: "Default", optionValues: [], price: "", salePrice: "", stockQuantity: "0", isActive: true }],
};

/** SKU for a variant left blank, e.g. "LEATHER-JACKET-BLACK-M". */
function autoSku(slug: string, optionValues: string[]) {
  const part = (s: string) => slugify(s).toUpperCase();
  return [part(slug).slice(0, 40) || "ITEM", ...optionValues.map(part).filter(Boolean)].join("-").slice(0, 60);
}

function toInput(v: ProductFormValues) {
  const names = v.optionNames.map((o) => o.value.trim()).filter(Boolean);
  const blank = (s: string) => (s.trim() === "" ? undefined : s.trim());
  const typed = new Set(v.variants.map((variant) => variant.sku.trim().toUpperCase()).filter(Boolean));
  return {
    name: v.name,
    slug: v.slug,
    categoryId: v.categoryId,
    shortDescription: v.shortDescription,
    description: v.description,
    specifications: v.specifications.filter((s) => s.label.trim() || s.value.trim()),
    optionNames: names,
    price: v.price,
    salePrice: blank(v.salePrice),
    costPrice: blank(v.costPrice),
    status: v.status,
    isFeatured: v.isFeatured,
    lowStockThreshold: v.lowStockThreshold,
    variants: v.variants.map((variant) => {
      const options: Record<string, string> = {};
      names.forEach((n, i) => {
        const value = variant.optionValues[i]?.trim();
        if (value) options[n] = value;
      });
      const autoTitle = Object.values(options).join(" / ") || "Default";
      let sku = variant.sku.trim();
      if (!sku) {
        const base = autoSku(v.slug || v.name, Object.values(options));
        sku = base;
        for (let n = 2; typed.has(sku); n++) sku = `${base}-${n}`;
        typed.add(sku);
      }
      return {
        id: variant.id,
        sku,
        title: variant.title.trim() || autoTitle,
        options,
        price: blank(variant.price),
        salePrice: blank(variant.salePrice),
        stockQuantity: variant.stockQuantity || "0",
        isActive: variant.isActive,
      };
    }),
  };
}

/** Maps a Zod issue path onto the form field that shows it. */
function formPath(path: PropertyKey[]): string {
  if (path[0] === "variants" && typeof path[1] === "number") {
    const field = path[2] === "options" ? "optionValues" : (path[2] as string | undefined);
    return field ? `variants.${path[1]}.${field}` : "variants";
  }
  if (path[0] === "optionNames") return "optionNames";
  return path.map(String).join(".");
}

type Props = {
  productId: string | null;
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
  currency: string;
};

export function ProductForm({ productId, initial, categories, currency }: Props) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(productId));
  const form = useForm<ProductFormValues>({ defaultValues: initial });
  const { register, handleSubmit, control, setValue, setError, formState } = form;
  const { errors, isSubmitting } = formState;

  const specs = useFieldArray({ control, name: "specifications" });
  const optionNames = useFieldArray({ control, name: "optionNames" });
  const variants = useFieldArray({ control, name: "variants", keyName: "key" });
  const names = useWatch({ control, name: "optionNames" });

  // After a save the server sends fresh values (new variant ids, normalised
  // fields). Reset only when they actually change so unrelated refreshes (e.g.
  // an image upload) never discard edits in progress.
  const initialKey = JSON.stringify(initial);
  React.useEffect(() => {
    form.reset(JSON.parse(initialKey) as ProductFormValues);
  }, [initialKey, form]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const input = toInput(values);
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(formPath(issue.path) as Path<ProductFormValues>, { message: issue.message });
      }
      setFormError(parsed.error.issues[0]?.message ?? "Please fix the highlighted fields.");
      return;
    }
    const result = await saveProductAction(productId, input);
    if (!result.ok) {
      setFormError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Saved.");
    if (!productId) router.push(`/admin/products/${result.data.id}`);
    else router.refresh();
  });

  const err = (path: string) => {
    const parts = path.split(".");
    let node: unknown = errors;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    return (node as { message?: string } | undefined)?.message;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-5">
        <FormError message={formError} />
        <Card className="grid gap-4 p-5">
          <Field label="Name" htmlFor="name" required error={err("name")}>
            <Input
              id="name"
              aria-invalid={Boolean(err("name"))}
              {...register("name", {
                onChange: (e) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value));
                },
              })}
            />
          </Field>
          <Field label="Web address" htmlFor="slug" required error={err("slug")} hint="Filled in from the name. Shown in the link: /products/your-product">
            <Input id="slug" aria-invalid={Boolean(err("slug"))} {...register("slug", { onChange: () => setSlugTouched(true) })} />
          </Field>
          <Field label="Short description" htmlFor="shortDescription" error={err("shortDescription")} hint="Shown on product cards (max 300 characters).">
            <Textarea id="shortDescription" className="min-h-16" {...register("shortDescription")} />
          </Field>
          <Field label="Description" htmlFor="description" error={err("description")}>
            <Textarea id="description" className="min-h-40" {...register("description")} />
          </Field>
        </Card>

        <Card className="grid gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Specifications</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => specs.append({ label: "", value: "" })}>
              <Plus /> Add row
            </Button>
          </div>
          {specs.fields.length === 0 ? <p className="text-sm text-muted">No specifications yet.</p> : null}
          {specs.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <Input aria-label={`Specification ${i + 1} label`} placeholder="Label" {...register(`specifications.${i}.label`)} />
              <Input aria-label={`Specification ${i + 1} value`} placeholder="Value" {...register(`specifications.${i}.value`)} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove row" onClick={() => specs.remove(i)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </Card>

        <Card className="grid gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">Options & variants</h2>
            <p className="mt-0.5 text-xs text-muted">
              Selling one version only? Just set its stock below. For sizes or colours, add an option (e.g. Size), then one row per
              choice. Leave SKU and price empty to fill them in automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {optionNames.fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-1">
                <Input aria-label={`Option ${i + 1} name`} placeholder={`Option ${i + 1}`} className="w-36" {...register(`optionNames.${i}.value`)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove option"
                  onClick={() => {
                    optionNames.remove(i);
                    variants.fields.forEach((_, vi) => {
                      const vals = [...(form.getValues(`variants.${vi}.optionValues`) ?? [])];
                      vals.splice(i, 1);
                      setValue(`variants.${vi}.optionValues`, vals);
                    });
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {optionNames.fields.length < 3 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => optionNames.append({ value: "" })}>
                <Plus /> Add option
              </Button>
            ) : null}
          </div>
          {err("variants") ? <p role="alert" className="text-xs text-danger">{err("variants")}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">SKU</th>
                  {names.map((n, i) => (
                    <th key={i} className="pb-2 font-medium">{n.value || `Option ${i + 1}`}</th>
                  ))}
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Price ({currency})</th>
                  <th className="pb-2 font-medium">Sale</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">On sale</th>
                  <th />
                </tr>
              </thead>
              <tbody className="align-top">
                {variants.fields.map((v, i) => (
                  <tr key={v.key} className="border-t border-line-soft">
                    <td className="py-2 pr-2">
                      <Input aria-label={`Variant ${i + 1} SKU`} placeholder="Auto" className="h-9 w-32 font-mono text-xs uppercase" aria-invalid={Boolean(err(`variants.${i}.sku`))} {...register(`variants.${i}.sku`)} />
                      {err(`variants.${i}.sku`) ? <p className="mt-1 text-xs text-danger">{err(`variants.${i}.sku`)}</p> : null}
                    </td>
                    {names.map((_, oi) => (
                      <td key={oi} className="py-2 pr-2">
                        <Input aria-label={`Variant ${i + 1} option ${oi + 1}`} className="h-9 w-28" {...register(`variants.${i}.optionValues.${oi}`)} />
                      </td>
                    ))}
                    <td className="py-2 pr-2">
                      <Input aria-label={`Variant ${i + 1} title`} placeholder="Auto" className="h-9 w-36" {...register(`variants.${i}.title`)} />
                    </td>
                    <td className="py-2 pr-2">
                      <Input aria-label={`Variant ${i + 1} price`} inputMode="decimal" placeholder="—" className="h-9 w-24" {...register(`variants.${i}.price`)} />
                    </td>
                    <td className="py-2 pr-2">
                      <Input aria-label={`Variant ${i + 1} sale price`} inputMode="decimal" placeholder="—" className="h-9 w-24" aria-invalid={Boolean(err(`variants.${i}.salePrice`))} {...register(`variants.${i}.salePrice`)} />
                      {err(`variants.${i}.salePrice`) ? <p className="mt-1 max-w-28 text-xs text-danger">{err(`variants.${i}.salePrice`)}</p> : null}
                    </td>
                    <td className="py-2 pr-2">
                      {v.id ? (
                        <span className="inline-flex h-9 items-center text-xs text-muted" title="Use Inventory below to adjust stock">
                          {v.stockQuantity} · change in Inventory below
                        </span>
                      ) : (
                        <Input aria-label={`Variant ${i + 1} opening stock`} inputMode="numeric" className="h-9 w-20" {...register(`variants.${i}.stockQuantity`)} />
                      )}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <Checkbox aria-label={`Variant ${i + 1} active`} className="mt-3" {...register(`variants.${i}.isActive`)} />
                    </td>
                    <td className="py-2">
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove variant" disabled={variants.fields.length === 1} onClick={() => variants.remove(i)}>
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => variants.append({ sku: "", title: "", optionValues: names.map(() => ""), price: "", salePrice: "", stockQuantity: "0", isActive: true })}
            >
              <Plus /> Add variant
            </Button>
            <p className="mt-2 text-xs text-muted">Removed variants with order history are deactivated instead of deleted.</p>
          </div>
        </Card>
      </div>

      <div className="grid content-start gap-5">
        <Card className="grid gap-4 p-5">
          <Field label="Status" htmlFor="status">
            <NativeSelect id="status" {...register("status")}>
              <option value="draft">Draft (hidden from customers)</option>
              <option value="active">Active (on sale in the store)</option>
              <option value="archived">Archived (hidden, kept for records)</option>
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register("isFeatured")} /> Featured on the home page
          </label>
          <Field label="Category" htmlFor="categoryId">
            <NativeSelect id="categoryId" {...register("categoryId")}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </NativeSelect>
          </Field>
        </Card>
        <Card className="grid gap-4 p-5">
          <Field label={`Price (${currency})`} htmlFor="price" required error={err("price")}>
            <Input id="price" inputMode="decimal" aria-invalid={Boolean(err("price"))} {...register("price")} />
          </Field>
          <Field label="Sale price" htmlFor="salePrice" error={err("salePrice")} hint="Leave empty for no discount.">
            <Input id="salePrice" inputMode="decimal" aria-invalid={Boolean(err("salePrice"))} {...register("salePrice")} />
          </Field>
          <Field label="Cost price" htmlFor="costPrice" error={err("costPrice")} hint="Private. Used for profit reports.">
            <Input id="costPrice" inputMode="decimal" {...register("costPrice")} />
          </Field>
          <Field label="Low-stock alert at" htmlFor="lowStockThreshold" error={err("lowStockThreshold")} hint="You'll be warned on the dashboard when stock drops to this number.">
            <Input id="lowStockThreshold" inputMode="numeric" {...register("lowStockThreshold")} />
          </Field>
        </Card>
      </div>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 lg:col-span-2">
        {formState.isDirty ? (
          <span className="rounded-full border border-line-soft bg-card px-3 py-1 text-xs text-muted shadow-[var(--shadow-pop)]">Unsaved changes</span>
        ) : null}
        <Button type="submit" size="lg" loading={isSubmitting} className="shadow-[var(--shadow-pop)]">
          {productId ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
