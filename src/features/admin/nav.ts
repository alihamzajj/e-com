import type { Permission, Profile } from "@/types/domain";
import { profileHasPermission } from "@/lib/auth/session";

export type NavKey =
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "customers"
  | "questions"
  | "support"
  | "coupons"
  | "reports"
  | "settings"
  | "staff";

export type NavGroup = "" | "Sell" | "Catalogue" | "Customer care" | "Store";

export type NavItem = { key: NavKey; href: string; label: string; group: NavGroup };

const ITEMS: (NavItem & { permission: Permission | "admin" | null })[] = [
  { key: "dashboard", href: "/admin", label: "Dashboard", group: "", permission: null },
  { key: "orders", href: "/admin/orders", label: "Orders", group: "Sell", permission: "orders" },
  { key: "customers", href: "/admin/customers", label: "Customers", group: "Sell", permission: "customers" },
  { key: "coupons", href: "/admin/coupons", label: "Coupons", group: "Sell", permission: "coupons" },
  { key: "reports", href: "/admin/reports", label: "Reports", group: "Sell", permission: "reports" },
  { key: "products", href: "/admin/products", label: "Products", group: "Catalogue", permission: "products" },
  { key: "categories", href: "/admin/categories", label: "Categories", group: "Catalogue", permission: "products" },
  { key: "questions", href: "/admin/questions", label: "Q&A & reviews", group: "Customer care", permission: "support" },
  { key: "support", href: "/admin/support", label: "Messages", group: "Customer care", permission: "support" },
  { key: "settings", href: "/admin/settings", label: "Settings", group: "Store", permission: "settings" },
  { key: "staff", href: "/admin/staff", label: "Staff", group: "Store", permission: "admin" },
];

export function navFor(profile: Profile): NavItem[] {
  return ITEMS.filter((i) =>
    i.permission === null ? true : i.permission === "admin" ? profile.role === "admin" : profileHasPermission(profile, i.permission),
  ).map(({ key, href, label, group }) => ({ key, href, label, group }));
}
