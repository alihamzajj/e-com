import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { getProfile, isStaffProfile, requireUser } from "@/lib/auth/session";
import { ProfileForm } from "@/components/account/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Profile" };

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" aria-busy />}>
      <Profile searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Profile({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const user = await requireUser("/account");
  const [profile, sp] = await Promise.all([getProfile(), searchParams]);
  return (
    <div className="space-y-6">
      {sp.password === "updated" ? (
        <p role="status" className="rounded-sm bg-success-soft px-4 py-3 text-sm text-success">
          Your password was updated.
        </p>
      ) : null}
      {isStaffProfile(profile) ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="flex items-center gap-2 text-sm">
            <LayoutDashboard className="size-4 text-accent" aria-hidden /> You have {profile?.role} access to the store dashboard.
          </p>
          <Button asChild size="sm" variant="dark">
            <Link href="/admin">
              Open dashboard <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            email={profile?.email ?? user.email ?? ""}
            defaults={{ fullName: profile?.full_name ?? "", phone: profile?.phone ?? "", marketingOptIn: profile?.marketing_opt_in ?? false }}
          />
        </CardContent>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-semibold">Password</p>
          <p className="text-sm text-muted">We&apos;ll email you a secure link to set a new password.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/forgot-password">Change password</Link>
        </Button>
      </Card>
    </div>
  );
}
