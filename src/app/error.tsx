"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Never render error.message: it can contain internal details. The digest lets
// support match the server log entry.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container-page flex min-h-[70dvh] flex-col items-center justify-center gap-6 py-20 text-center">
      <p className="display text-[clamp(3.5rem,10vw,7rem)]">Something broke</p>
      <p className="max-w-md text-sm text-muted">
        An unexpected error occurred. Please try again — if it keeps happening, contact us
        {error.digest ? ` and mention reference ${error.digest}` : ""}.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
