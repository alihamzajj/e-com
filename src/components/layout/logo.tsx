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
 * styled mark from the store name: a shopping-bag tile carrying the initial, then
 * the first word in the bold display face and the rest in a lighter weight on the
 * same line, with a short tagline underneath.
 */
export function Logo({ name, logoUrl, className, tone = "dark" }: Props) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const second = rest.join(" ");
  const ink = tone === "light" ? "text-white" : "text-ink";
  return (
    <Link
      href="/"
      className={cn("group inline-flex min-h-10 shrink-0 items-center gap-2 min-[400px]:gap-2.5 lg:gap-3", className)}
      aria-label={`${name} home`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={200} height={48} unoptimized={!logoUrl.startsWith("/")} className="h-9 w-auto md:h-11" />
      ) : (
        <>
          <span
            aria-hidden
            className="relative block h-[42px] w-9 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 lg:h-[54px] lg:w-[46px]"
          >
            <svg viewBox="0 0 46 54" className="absolute inset-0 size-full" fill="none">
              <path d="M14 17V13a9 9 0 0 1 18 0v4" className={tone === "light" ? "stroke-white" : "stroke-ink"} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="2" y="15" width="42" height="38" rx="7" className="fill-accent" />
              <rect x="2" y="48" width="42" height="5" rx="2.5" fill="rgb(0 0 0 / 0.12)" />
            </svg>
            <span className="display absolute inset-x-0 bottom-[3px] text-center text-[24px] leading-[34px] text-white lg:bottom-1 lg:text-[31px] lg:leading-[42px]">
              {first.charAt(0)}
            </span>
          </span>
          <span aria-hidden className="flex flex-col leading-none">
            <span className={cn("text-[17px] whitespace-nowrap min-[400px]:text-[21px] sm:text-[24px] md:text-[21px] lg:text-[30px]", ink)}>
              <span className="display tracking-[0.02em]">{first}</span>
              {second ? <span className="ml-1.5 font-normal tracking-[0.04em] uppercase">{second}</span> : null}
            </span>
            <span
              className={cn(
                "mt-1 hidden text-[9.5px] font-semibold tracking-[0.36em] uppercase sm:block lg:text-[10.5px]",
                tone === "light" ? "text-white/60" : "text-muted",
              )}
            >
              Shop everything
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
