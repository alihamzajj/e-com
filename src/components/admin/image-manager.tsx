"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { ConfirmButton, useActionRunner } from "@/components/admin/confirm-button";
import {
  deleteImageAction,
  moveImageAction,
  updateImageAltAction,
  uploadProductImagesAction,
} from "@/actions/admin/products";

type Image = { id: string; url: string; alt: string | null };

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX = 4 * 1024 * 1024;

export function ImageManager({ productId, images }: { productId: string; images: Image[] }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = React.useTransition();
  const { pending, run } = useActionRunner();

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const tooBig = list.filter((f) => f.size > MAX);
    if (tooBig.length) {
      toast.error(`${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} larger than 4 MB.`);
      return;
    }
    // One request per file keeps each Server Action body small.
    startUpload(async () => {
      let uploaded = 0;
      for (const file of list) {
        const fd = new FormData();
        fd.append("files", file);
        const result = await uploadProductImagesAction(productId, fd);
        if (result.ok) uploaded += result.data.uploaded;
        else toast.error(result.error);
      }
      if (uploaded) toast.success(`Uploaded ${uploaded} image${uploaded === 1 ? "" : "s"}.`);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {images.length === 0 ? <p className="text-sm text-muted">No images yet. The first image is used on product cards.</p> : null}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.id} className="overflow-hidden rounded-md border border-line-soft bg-card">
            <div className="relative aspect-square bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ""} className="size-full object-cover" loading="lazy" />
              {i === 0 ? <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">Main</span> : null}
            </div>
            <div className="grid gap-2 p-2">
              <Input
                aria-label="Alt text"
                defaultValue={img.alt ?? ""}
                placeholder="Describe the image"
                className="h-8 text-xs"
                onBlur={(e) => {
                  if (e.target.value !== (img.alt ?? "")) run(() => updateImageAltAction(img.id, e.target.value));
                }}
              />
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Move earlier" disabled={i === 0 || pending} onClick={() => run(() => moveImageAction(img.id, "up"))}>
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Move later" disabled={i === images.length - 1 || pending} onClick={() => run(() => moveImageAction(img.id, "down"))}>
                  <ArrowDown />
                </Button>
                <span className="flex-1" />
                <ConfirmButton title="Remove image?" description="The file is deleted from storage. This cannot be undone." confirmLabel="Remove" action={() => deleteImageAction(img.id)} variant="ghost">
                  Remove
                </ConfirmButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="sr-only" id="product-images" onChange={(e) => onFiles(e.target.files)} />
        <Button type="button" variant="outline" loading={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus /> Upload images
        </Button>
        <p className="mt-2 text-xs text-muted">JPEG, PNG, WebP or AVIF, up to 4 MB each.</p>
      </div>
    </div>
  );
}
