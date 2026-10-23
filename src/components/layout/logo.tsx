import Link from "next/link";
import Image from "next/image";

export function Logo({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  return (
    <Link href="/" className={className ?? "inline-flex min-h-10 shrink-0 items-center"} aria-label={`${name} home`}>
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={140} height={32} unoptimized={!logoUrl.startsWith("/")} className="h-7 w-auto" />
      ) : (
        <span className="text-[19px] font-extrabold tracking-[0.18em] text-ink" style={{ fontVariationSettings: '"wdth" 110' }}>
          {name}
        </span>
      )}
    </Link>
  );
}
