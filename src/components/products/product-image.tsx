import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = Omit<ImageProps, "src" | "alt"> & { src: string | null | undefined; alt: string | null | undefined };

/**
 * Local images (/demo, /public) go through the optimizer. Remote images
 * (Supabase Storage) are rendered unoptimised until the storage host is added to
 * images.remotePatterns in next.config.ts.
 */
export function ProductImage({ src, alt, className, ...props }: Props) {
  if (!src) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-surface text-subtle", className)} aria-hidden>
        <ImageOff className="size-6" />
      </div>
    );
  }
  const local = src.startsWith("/");
  return <Image src={src} alt={alt ?? ""} unoptimized={!local} className={cn("object-cover", className)} {...props} />;
}
