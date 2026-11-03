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
 * Store wordmark. With an uploaded logo it shows the image; otherwise it draws the
 * brand mark: an orange shopping bag carrying the store's initial, the first word
 * of the name large in heavy ink and the rest small underneath in accent capitals.
 */
export function Logo({ name, logoUrl, className, tone = "dark" }: Props) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const second = rest.join(" ");
  return (
    <Link
      href="/"
      className={cn("group inline-flex min-h-10 shrink-0 items-center gap-2.5 lg:gap-3.5", className)}
      aria-label={`${name} home`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={200} height={48} unoptimized={!logoUrl.startsWith("/")} className="h-9 w-auto md:h-11" />
      ) : (
        <>
          <span
            aria-hidden
            className="relative block h-[46px] w-[39px] shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 lg:h-[58px] lg:w-[49px]"
          >
            <svg viewBox="0 0 46 54" className="absolute inset-0 size-full" fill="none">
              <path d="M14 17V13a9 9 0 0 1 18 0v4" className={tone === "light" ? "stroke-white" : "stroke-ink"} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="2" y="15" width="42" height="38" rx="7" className="fill-accent" />
              <rect x="2" y="48" width="42" height="5" rx="2.5" fill="rgb(0 0 0 / 0.12)" />
            </svg>
            <span className="display absolute inset-x-0 bottom-[3px] text-center text-[26px] leading-[37px] text-white lg:bottom-1 lg:text-[33px] lg:leading-[45px]">
              {first.charAt(0)}
            </span>
          </span>
          <span aria-hidden className="flex flex-col leading-none">
            <span
              className={cn(
                "font-[family-name:var(--font-display)] text-[28px] leading-[0.8] font-black whitespace-nowrap uppercase lg:text-[36px]",
                tone === "light" ? "text-white" : "text-ink",
              )}
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {first}
            </span>
            {second ? (
              <span className="mt-1.5 pl-px text-[9px] leading-none font-bold tracking-[0.32em] whitespace-nowrap text-accent uppercase lg:mt-2 lg:text-[11px]">
                {second}
              </span>
            ) : null}
          </span>
        </>
      )}
    </Link>
  );
}
