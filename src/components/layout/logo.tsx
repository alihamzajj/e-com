import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type Props = {
  name: string;
  logoUrl: string | null;
  className?: string;
  /** "dark" for light backgrounds (header), "light" for dark ones (footer). */
  tone?: "dark" | "light";
};

/**
 * Store wordmark. With an uploaded logo it shows the image; otherwise it builds a
 * styled mark from the store name: a monogram tile plus the first word set large
 * in the condensed display face and the rest tracked out underneath.
 */
export function Logo({ name, logoUrl, className, tone = "dark" }: Props) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const second = rest.join(" ");
  return (
    <Link
      href="/"
      className={cn("group inline-flex min-h-10 shrink-0 items-center gap-2.5", className)}
      aria-label={`${name} home`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={140} height={32} unoptimized={!logoUrl.startsWith("/")} className="h-7 w-auto" />
      ) : (
        <>
          <span
            aria-hidden
            className="display flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-accent pt-0.5 text-[24px] text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6"
          >
            {first.charAt(0)}
          </span>
          <span aria-hidden className="flex flex-col leading-none">
            <span className={cn("display text-[23px] tracking-[0.04em]", tone === "light" ? "text-white" : "text-ink")}>{first}</span>
            {second ? (
              <span
                className={cn(
                  "mt-[3px] text-[9.5px] font-semibold tracking-[0.42em] uppercase",
                  tone === "light" ? "text-white/60" : "text-muted",
                )}
              >
                {second}
              </span>
            ) : null}
          </span>
        </>
      )}
    </Link>
  );
}
