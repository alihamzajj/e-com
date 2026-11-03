import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { publicEnv } from "@/lib/config/public";

// Uploads live in this project's Supabase Storage, which next.config.ts allows the
// image optimiser to fetch (it resizes them and serves WebP/AVIF).
const storagePrefix = publicEnv.supabaseUrl ? `${publicEnv.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/` : null;

type Props = Omit<ImageProps, "src" | "alt"> & { src: string | null | undefined; alt: string | null | undefined };

/**
 * Local images (/demo, /public) and uploads in the store's Supabase Storage go
 * through the optimiser; any other remote URL is shown as it is.
 */
export function ProductImage({ src, alt, className, ...props }: Props) {
  if (!src) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-surface text-subtle", className)} aria-hidden>
        <ImageOff className="size-6" />
      </div>
    );
  }
  const optimisable = src.startsWith("/") || (storagePrefix !== null && src.startsWith(storagePrefix));
  return <Image src={src} alt={alt ?? ""} unoptimized={!optimisable} className={cn("object-cover", className)} {...props} />;
}
