import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/account/auth-forms";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <Card className="p-6 md:p-8">
      <h1 className="display mb-2 text-5xl">Create account</h1>
      <p className="mb-6 text-sm text-muted">One account for orders, addresses, reviews and support.</p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
