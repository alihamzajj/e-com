import Link from "next/link";
import { getStoreSettings } from "@/features/settings/queries";
import { Logo } from "@/components/layout/logo";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const settings = await getStoreSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-[68px] items-center justify-between md:h-20">
        <Logo name={settings.storeName} logoUrl={settings.logoUrl} />
        <Link href="/products" className="tap text-sm text-muted hover:text-ink">
          Back to shop
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-8 pb-20 md:pt-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
