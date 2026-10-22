import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/auth-forms";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Card className="p-6 md:p-8">
      <h1 className="display mb-2 text-5xl">New password</h1>
      <Suspense fallback={<div className="skeleton h-48 rounded" aria-busy />}>
        <Gate />
      </Suspense>
    </Card>
  );
}

async function Gate() {
  // The reset link signs the user in (via /auth/confirm) before landing here.
  const user = await getSessionUser();
  if (!user) {
    return (
      <p className="text-sm text-muted">
        This reset link is invalid or has expired.{" "}
        <Link href="/forgot-password" className="font-medium text-ink underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }
  return (
    <>
      <p className="mb-6 text-sm text-muted">Choose a new password for {user.email}.</p>
      <ResetPasswordForm />
    </>
  );
}
