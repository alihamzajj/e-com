import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/account/auth-forms";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6 md:p-8">
      <h1 className="display mb-2 text-5xl">Forgot password</h1>
      <p className="mb-6 text-sm text-muted">Enter your email and we&apos;ll send you a link to choose a new password.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
