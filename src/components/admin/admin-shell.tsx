"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Users,
} from "lucide-react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { signOutAction } from "@/actions/admin/session";
import type { NavItem, NavKey } from "@/features/admin/nav";

type Badges = Partial<Record<NavKey, number>>;

const BADGE_HINTS: Partial<Record<NavKey, string>> = {
  orders: "waiting to be confirmed",
  products: "low or out of stock",
  questions: "to answer or review",
  support: "new messages",
};

const ICONS: Record<NavKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  products: Package,
  categories: FolderTree,
  customers: Users,
  questions: MessageSquareText,
  support: LifeBuoy,
  coupons: TicketPercent,
  reports: BarChart3,
  settings: Settings,
  staff: ShieldCheck,
};

type Props = {
  storeName: string;
  user: { name: string; email: string; role: string };
  items: NavItem[];
  badges: Badges;
  children: React.ReactNode;
};

function NavLinks({ items, badges, onNavigate }: { items: NavItem[]; badges: Badges; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Admin" className="grid gap-4">
      {groups.map((group) => (
        <div key={group || "main"} className="grid gap-0.5">
          {group ? (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{group}</p>
          ) : null}
          {items
            .filter((i) => i.group === group)
            .map((item) => {
              const Icon = ICONS[item.key];
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const badge = badges[item.key] ?? 0;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink",
                    active && "bg-ink text-white hover:bg-ink hover:text-white",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 ? (
                    <span
                      title={`${badge} ${BADGE_HINTS[item.key] ?? ""}`}
                      className={cn(
                        "min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-accent-ink tabular-nums",
                        active && "bg-white text-ink",
                      )}
                    >
                      {badge > 99 ? "99+" : badge}
                      <span className="sr-only"> {BADGE_HINTS[item.key]}</span>
                    </span>
                  ) : null}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ user }: { user: Props["user"] }) {
  return (
    <div className="grid gap-2 border-t border-line-soft p-3">
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">
          {user.email} · <span className="capitalize">{user.role}</span>
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm border border-line text-xs text-ink hover:border-ink/40"
        >
          <ExternalLink className="size-3.5" /> Storefront
        </Link>
        <form action={signOutAction} className="flex-1">
          <button className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-sm bg-surface text-xs text-ink hover:bg-line-soft">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ storeName, user, items, badges, children }: Props) {
  const [open, setOpen] = React.useState(false);
  const pending = Object.values(badges).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line-soft bg-card lg:flex">
        <div className="flex h-14 items-center justify-between border-b border-line-soft px-4">
          <Link href="/admin" className="text-sm font-extrabold tracking-[0.12em] text-ink">
            {storeName}
          </Link>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-strong">
            Admin
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks items={items} badges={badges} />
        </div>
        <UserBlock user={user} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line-soft bg-card/95 px-4 backdrop-blur lg:hidden">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="relative rounded-sm p-2 text-ink hover:bg-surface" aria-label="Open navigation">
              <Menu className="size-5" />
              {pending > 0 ? <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" /> : null}
            </DialogTrigger>
            <SheetContent title={`${storeName} admin`} side="left">
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto p-3">
                  <NavLinks items={items} badges={badges} onNavigate={() => setOpen(false)} />
                </div>
                <UserBlock user={user} />
              </div>
            </SheetContent>
          </Dialog>
          <span className="text-sm font-extrabold tracking-[0.12em]">{storeName}</span>
          <Link href="/" className="rounded-sm p-2 text-muted hover:bg-surface" aria-label="View storefront">
            <ExternalLink className="size-4" />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
