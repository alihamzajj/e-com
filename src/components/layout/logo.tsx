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
 * brand mark: an orange bag whose white "G" makes the monogram, then the first
 * word of the name in lowercase Poppins and the rest in small spaced-out orange
 * capitals, right-aligned underneath. Everything scales from --logo, the size of
 * the first word; the rest is about a third of it and never below 13px.
 */
export function Logo({ name, logoUrl, className, tone = "dark" }: Props) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const second = rest.join(" ");
  const light = tone === "light";
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex min-h-10 shrink-0 items-center gap-[calc(var(--logo)*0.16)] [--logo:36px] md:[--logo:42px] lg:[--logo:46px]",
        className,
      )}
      aria-label={`${name} home`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={200} height={48} unoptimized={!logoUrl.startsWith("/")} className="h-9 w-auto md:h-11" />
      ) : (
        <>
          <svg
            aria-hidden
            viewBox="0 0 120 132"
            className="relative top-[calc(var(--logo)*-0.056)] h-[calc(var(--logo)*1.02)] w-auto shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6"
          >
            <path d="M37 46V35a23 23 0 0 1 46 0v11" fill="none" stroke={light ? "#F2F1EE" : "#1A120D"} strokeWidth="11" strokeLinecap="round" />
            <rect x="6" y="34" width="108" height="96" rx="36" fill="#FF5A1F" />
            <path d="M78.7 67.3A26.5 26.5 0 1 0 86.5 86H63" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span aria-hidden className="inline-flex flex-col items-end">
            <span
              className={cn(
                "font-[family-name:var(--font-logo)] text-[length:var(--logo)] leading-[0.74] font-extrabold tracking-[-0.055em] whitespace-nowrap lowercase",
                light ? "text-[#F2F1EE]" : "text-[#1A120D]",
              )}
            >
              {first}
            </span>
            {second ? (
              <span className="-mr-[0.3em] mt-[calc(var(--logo)*-0.013)] text-[length:max(13px,calc(var(--logo)*0.32))] leading-none font-extrabold tracking-[0.3em] whitespace-nowrap text-[#FF5A1F] uppercase">
                {second}
              </span>
            ) : null}
          </span>
        </>
      )}
    </Link>
  );
}
