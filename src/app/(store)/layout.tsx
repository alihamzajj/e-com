import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SetupNotice } from "@/components/store/setup-notice";
import { MotionRoot } from "@/components/motion/motion-root";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SetupNotice />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <MotionRoot />
    </div>
  );
}
