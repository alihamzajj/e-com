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
 * Store badge. With an uploaded logo it shows the image; otherwise it draws the
 * brand badge: a rounded frame holding the orange bag with a white "G", a thin
 * divider, then the first word of the name in bold orange capitals and the rest
 * in spaced capitals underneath. Everything scales from --logo, the size of the
 * first word; the second line never drops below 12px so it stays readable.
 */
export function Logo({ name, logoUrl, className, tone = "dark" }: Props) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const second = rest.join(" ");
  const light = tone === "light";
  const ink = light ? "#F2F1EE" : "#1A120D";

  if (logoUrl) {
    return (
      <Link href="/" className={cn("inline-flex min-h-10 shrink-0 items-center", className)} aria-label={`${name} home`}>
        <Image src={logoUrl} alt={name} width={200} height={48} unoptimized={!logoUrl.startsWith("/")} className="h-9 w-auto md:h-11" />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      style={{ borderColor: ink }}
      className={cn(
        "group inline-flex shrink-0 items-center rounded-[calc(var(--logo)*0.42)] border-solid [--logo:22px] md:[--logo:27px] lg:[--logo:30px]",
        "gap-[calc(var(--logo)*0.42)] border-[length:max(2px,calc(var(--logo)*0.09))] px-[calc(var(--logo)*0.55)] py-[calc(var(--logo)*0.3)]",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 100 112"
        className="h-[calc(var(--logo)*1.5)] w-auto shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6"
      >
        <path d="M31 42V31a19 19 0 0 1 38 0v11" fill="none" stroke={ink} strokeWidth="10" strokeLinecap="round" />
        <rect x="4" y="34" width="92" height="76" rx="18" fill="#FF5A1F" />
        <text x="50" y="95" textAnchor="middle" fill="#fff" fontSize="60" fontWeight="800" style={{ fontFamily: "var(--font-logo)" }}>
          {first.charAt(0).toUpperCase()}
        </text>
      </svg>
      <span aria-hidden className="w-[max(1.5px,calc(var(--logo)*0.07))] self-stretch" style={{ background: ink }} />
      <span className="inline-flex flex-col items-start">
        <span className="font-[family-name:var(--font-logo)] text-[length:var(--logo)] leading-[0.8] font-extrabold tracking-[0.01em] whitespace-nowrap text-[#FF5A1F] uppercase">
          {first}
        </span>
        {second ? <span className="sr-only"> </span> : null}
        {second ? (
          <span
            style={{ color: ink }}
            className="mt-[calc(var(--logo)*0.16)] font-[family-name:var(--font-logo)] text-[length:max(12px,calc(var(--logo)*0.44))] leading-none font-extrabold tracking-[0.38em] whitespace-nowrap uppercase"
          >
            {second}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
