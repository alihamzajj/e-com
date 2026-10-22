import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-[70dvh] flex-col items-center justify-center gap-6 py-20 text-center">
      <p className="display text-[clamp(5rem,18vw,12rem)] text-ink/90">404</p>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/products">Shop products</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
