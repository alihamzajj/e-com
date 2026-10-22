import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AddressManager } from "@/components/account/address-manager";
import type { Address } from "@/types/domain";

export const metadata = { title: "Addresses" };

export default function AddressesPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 rounded-lg" aria-busy />}>
      <Addresses />
    </Suspense>
  );
}

async function Addresses() {
  await requireUser("/account/addresses");
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return <AddressManager addresses={(data ?? []) as Address[]} />;
}
