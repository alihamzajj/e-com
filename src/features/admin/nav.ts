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

export type NavItem = { key: NavKey; href: string; label: string };

const ITEMS: (NavItem & { permission: Permission | "admin" | null })[] = [
  { key: "dashboard", href: "/admin", label: "Dashboard", permission: null },
  { key: "orders", href: "/admin/orders", label: "Orders", permission: "orders" },
  { key: "products", href: "/admin/products", label: "Products", permission: "products" },
  { key: "categories", href: "/admin/categories", label: "Categories", permission: "products" },
  { key: "customers", href: "/admin/customers", label: "Customers", permission: "customers" },
  { key: "questions", href: "/admin/questions", label: "Q&A & reports", permission: "support" },
  { key: "support", href: "/admin/support", label: "Support", permission: "support" },
  { key: "coupons", href: "/admin/coupons", label: "Coupons", permission: "coupons" },
  { key: "reports", href: "/admin/reports", label: "Reports", permission: "reports" },
  { key: "settings", href: "/admin/settings", label: "Settings", permission: "settings" },
  { key: "staff", href: "/admin/staff", label: "Staff", permission: "admin" },
];

export function navFor(profile: Profile): NavItem[] {
  return ITEMS.filter((i) =>
    i.permission === null ? true : i.permission === "admin" ? profile.role === "admin" : profileHasPermission(profile, i.permission),
  ).map(({ key, href, label }) => ({ key, href, label }));
}
