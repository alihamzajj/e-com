import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SignInForm } from "@/components/account/auth-forms";
import { safeNextPath } from "@/lib/auth/redirects";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Card className="p-6 md:p-8">
      <h1 className="display mb-2 text-5xl">Sign in</h1>
      <p className="mb-6 text-sm text-muted">Track orders, save addresses and check out faster.</p>
      <Suspense fallback={<div className="skeleton h-64 rounded" aria-busy />}>
        <Form searchParams={props.searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  return <SignInForm next={safeNextPath(sp.next)} linkError={sp.error === "link"} />;
}
