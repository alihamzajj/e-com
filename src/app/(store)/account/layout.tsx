import type { Metadata } from "next";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = { title: { default: "Your account", template: "%s · Account" }, robots: { index: false } };

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-page pt-8 md:pt-12">
      <h1 className="display mb-8 text-[clamp(2.75rem,7vw,5.5rem)]">Account</h1>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
