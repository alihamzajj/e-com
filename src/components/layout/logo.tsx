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
 * brand mark: an orange shopping bag with a smile, the first word of the store
 * name in heavy ink and the rest underneath in spaced-out accent capitals.
 */
export function Logo({ name, logoUrl, className, tone = "dark" }: Props) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const second = rest.join(" ");
  return (
    <Link
      href="/"
      className={cn("group inline-flex min-h-10 shrink-0 items-center gap-2 lg:gap-2.5", className)}
      aria-label={`${name} home`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={200} height={48} unoptimized={!logoUrl.startsWith("/")} className="h-9 w-auto md:h-11" />
      ) : (
        <>
          <svg
            aria-hidden
            viewBox="0 0 48 52"
            fill="none"
            className="h-10 w-auto shrink-0 text-accent transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 lg:h-12"
          >
            <path d="M15 19v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
            <rect x="3" y="16" width="42" height="34" rx="9" fill="currentColor" />
            <path d="M16 30.5q8 8 16 0" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span aria-hidden className="flex flex-col leading-none">
            <span
              className={cn(
                "font-[family-name:var(--font-display)] text-[22px] font-black tracking-[0.01em] whitespace-nowrap uppercase lg:text-[28px]",
                tone === "light" ? "text-white" : "text-ink",
              )}
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {first}
            </span>
            {second ? (
              <span className="mt-1 text-[10px] font-extrabold tracking-[0.42em] whitespace-nowrap text-accent uppercase lg:text-[12px]">
                {second}
              </span>
            ) : null}
          </span>
        </>
      )}
    </Link>
  );
}
