import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/config/public";
import { toNumber } from "@/lib/utils/format";
import type { ShippingMethod, StoreSettings } from "@/types/domain";
import { DEMO_SETTINGS } from "@/features/catalog/demo-catalog";

export const SETTINGS_TAG = "store-settings";

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "NORTHKEY",
  tagline: "",
  logoUrl: null,
  currency: "PKR",
  locale: "en-PK",
  timezone: "Asia/Karachi",
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  socialLinks: {},
  shippingMethods: [],
  freeShippingThreshold: null,
  codEnabled: true,
  onlinePaymentsEnabled: false,
  newsletterEnabled: false,
  lowStockAlertEmail: null,
  hero: {},
  promo: {},
  policies: {},
};

type SettingsRow = Record<string, unknown> & { shipping_methods?: ShippingMethod[] };

export function mapSettings(row: SettingsRow | null): StoreSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    storeName: String(row.store_name ?? DEFAULT_SETTINGS.storeName),
    tagline: String(row.tagline ?? ""),
    logoUrl: (row.logo_url as string | null) ?? null,
    currency: String(row.currency ?? "PKR"),
    locale: String(row.locale ?? "en-PK"),
    timezone: String(row.timezone ?? "Asia/Karachi"),
    contactEmail: (row.contact_email as string | null) ?? null,
    contactPhone: (row.contact_phone as string | null) ?? null,
    contactAddress: (row.contact_address as string | null) ?? null,
    socialLinks: (row.social_links as Record<string, string>) ?? {},
    shippingMethods: (row.shipping_methods ?? []).map((m) => ({ ...m, price: toNumber(m.price) })),
    freeShippingThreshold: row.free_shipping_threshold == null ? null : toNumber(row.free_shipping_threshold as number),
    codEnabled: Boolean(row.cod_enabled),
    onlinePaymentsEnabled: Boolean(row.online_payments_enabled),
    newsletterEnabled: Boolean(row.newsletter_enabled),
    lowStockAlertEmail: (row.low_stock_alert_email as string | null) ?? null,
    hero: (row.hero as StoreSettings["hero"]) ?? {},
    promo: (row.promo as StoreSettings["promo"]) ?? {},
    policies: (row.policies as Record<string, string>) ?? {},
  };
}

/** Public store settings, cached and shared by every visitor. */
export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  // Demo mode (no database): sample content so the storefront can be previewed.
  if (!isSupabaseConfigured()) return { ...DEFAULT_SETTINGS, ...DEMO_SETTINGS };
  const { data, error } = await createPublicClient().from("store_settings").select("*").eq("id", 1).maybeSingle();
  if (error) {
    console.error("[settings] failed to load store settings", error.message);
    return DEFAULT_SETTINGS;
  }
  return mapSettings(data as SettingsRow | null);
}
