import Link from "next/link";
import { Suspense } from "react";
import { MessageSquareText } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { buildHref, pageParam, searchParam } from "@/features/admin/guard";
import { TableSkeleton } from "@/components/admin/common";
import { AnswerForm, DeleteAnswerButton, EditableText, QuestionModeration, ReportResolution, ReviewModeration } from "@/components/admin/moderation";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/pagination";
import { RatingStars } from "@/components/ui/rating";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { StoreSettings } from "@/types/domain";

export const metadata = { title: "Q&A & reports" };
const PAGE_SIZE = 20;

const TABS = [
  { id: "unanswered", label: "Unanswered" },
  { id: "answered", label: "Answered" },
  { id: "removed", label: "Hidden & spam" },
  { id: "reviews", label: "Reviews" },
  { id: "reports", label: "Reported content" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Question = {
  id: string; body: string; status: string; author_name: string; created_at: string; report_count: number; parent_id: string | null;
  products: { name: string; slug: string } | null;
  product_answers: { id: string; body: string; author_name: string; created_at: string }[];
};

async function QuestionsTab({ tab, page, settings }: { tab: "unanswered" | "answered" | "removed"; page: number; settings: StoreSettings }) {
  const supabase = await createClient();
  let query = supabase
    .from("product_questions")
    .select("id, body, status, author_name, created_at, report_count, parent_id, products(name, slug), product_answers(id, body, author_name, created_at)", { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (tab === "unanswered") query = query.eq("status", "pending").order("created_at", { ascending: true });
  else if (tab === "answered") query = query.eq("status", "answered").order("updated_at", { ascending: false });
  else query = query.in("status", ["hidden", "spam"]).order("updated_at", { ascending: false });
  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Question[];
  if (error) return <Card role="alert" className="p-6 text-sm text-danger">Questions could not be loaded.</Card>;
  if (rows.length === 0) {
    return <Card><EmptyState icon={<MessageSquareText />} title={tab === "unanswered" ? "No questions waiting" : "Nothing here"} description={tab === "unanswered" ? "New customer questions appear here, oldest first." : undefined} /></Card>;
  }
  return (
    <>
      <ul className="grid gap-3">
        {rows.map((q) => (
          <li key={q.id}>
            <Card className="grid gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-xs text-muted">
                  {q.products ? <Link href={`/products/${q.products.slug}`} target="_blank" className="font-medium text-ink hover:underline">{q.products.name}</Link> : "Unknown product"}
                  {" · "}{q.author_name} · {formatDateTime(q.created_at, settings.timezone, settings.locale)}
                  {q.parent_id ? " · follow-up" : ""}
                </div>
                <div className="flex gap-1">
                  {q.report_count > 0 ? <Badge tone="danger">{q.report_count} report{q.report_count === 1 ? "" : "s"}</Badge> : null}
                  <Badge className="capitalize">{q.status}</Badge>
                </div>
              </div>
              <EditableText id={q.id} initial={q.body} kind="question" />
              {q.product_answers.length > 0 ? (
                <ul className="grid gap-2 border-l-2 border-accent pl-4">
                  {q.product_answers.map((a) => (
                    <li key={a.id}>
                      <EditableText id={a.id} initial={a.body} kind="answer" />
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        {a.author_name} · {formatDateTime(a.created_at, settings.timezone, settings.locale)}
                        <DeleteAnswerButton answerId={a.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {q.status !== "hidden" && q.status !== "spam" ? <AnswerForm questionId={q.id} /> : null}
              <QuestionModeration questionId={q.id} status={q.status} />
            </Card>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} hrefFor={(n) => buildHref("/admin/questions", { tab }, { page: n })} />
    </>
  );
}

async function ReviewsTab({ page, settings }: { page: number; settings: StoreSettings }) {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("reviews")
    .select("id, rating, title, body, author_name, status, created_at, products(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  type R = { id: string; rating: number; title: string | null; body: string | null; author_name: string; status: string; created_at: string; products: { name: string; slug: string } | null };
  const rows = (data ?? []) as unknown as R[];
  if (rows.length === 0) return <Card><EmptyState title="No reviews yet" description="Reviews from delivered orders appear here." /></Card>;
  return (
    <>
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <RatingStars value={r.rating} />
                  {r.status === "hidden" ? <Badge>Hidden</Badge> : null}
                </div>
                {r.title ? <p className="mt-2 font-medium">{r.title}</p> : null}
                {r.body ? <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{r.body}</p> : null}
                <p className="mt-2 text-xs text-muted">
                  {r.author_name} on {r.products?.name ?? "—"} · {formatDateTime(r.created_at, settings.timezone, settings.locale)}
                </p>
              </div>
              <ReviewModeration reviewId={r.id} status={r.status} />
            </Card>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} hrefFor={(n) => buildHref("/admin/questions", { tab: "reviews" }, { page: n })} />
    </>
  );
}

async function ReportsTab({ settings }: { settings: StoreSettings }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_reports")
    .select("id, target_type, target_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100);
  type Report = { id: string; target_type: "question" | "review"; target_id: string; reason: string; created_at: string };
  const reports = (data ?? []) as Report[];
  if (reports.length === 0) return <Card><EmptyState title="No open reports" description="Content reported by customers appears here." /></Card>;
  const qIds = reports.filter((r) => r.target_type === "question").map((r) => r.target_id);
  const rIds = reports.filter((r) => r.target_type === "review").map((r) => r.target_id);
  const [{ data: qs }, { data: rs }] = await Promise.all([
    qIds.length ? supabase.from("product_questions").select("id, body, status, products(name)").in("id", qIds) : Promise.resolve({ data: [] }),
    rIds.length ? supabase.from("reviews").select("id, title, body, rating, status, products(name)").in("id", rIds) : Promise.resolve({ data: [] }),
  ]);
  type Target = { id: string; body: string | null; title?: string | null; status: string; products: { name: string } | null };
  const targets = new Map<string, Target>([...((qs ?? []) as unknown as Target[]), ...((rs ?? []) as unknown as Target[])].map((t) => [t.id, t]));
  return (
    <ul className="grid gap-3">
      {reports.map((r) => {
        const t = targets.get(r.target_id);
        return (
          <li key={r.id}>
            <Card className="grid gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>
                  <Badge tone="danger" className="mr-2 capitalize">{r.target_type}</Badge>
                  {t?.products?.name ?? "—"} · reported {formatDateTime(r.created_at, settings.timezone, settings.locale)}
                </span>
                {t ? <Badge className="capitalize">{t.status}</Badge> : <Badge>Deleted</Badge>}
              </div>
              <p className="text-sm"><span className="text-muted">Reason:</span> {r.reason}</p>
              {t ? <blockquote className="rounded-sm bg-surface p-3 text-sm whitespace-pre-wrap">{t.title ? <strong className="block">{t.title}</strong> : null}{t.body}</blockquote> : null}
              <div className="flex flex-wrap items-center gap-2">
                {t && r.target_type === "question" ? <QuestionModeration questionId={t.id} status={t.status} /> : null}
                {t && r.target_type === "review" ? <ReviewModeration reviewId={t.id} status={t.status} /> : null}
                <ReportResolution reportId={r.id} />
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

async function Questions({ searchParams }: { searchParams: PageProps<"/admin/questions">["searchParams"] }) {
  await requirePermission("support");
  const sp = await searchParams;
  const settings = await getStoreSettings();
  const tab = (TABS.some((t) => t.id === searchParam(sp, "tab")) ? searchParam(sp, "tab") : "unanswered") as Tab;
  const page = pageParam(sp);
  const supabase = await createClient();
  const [{ count: pending }, { count: reports }] = await Promise.all([
    supabase.from("product_questions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const counts: Partial<Record<Tab, number>> = { unanswered: pending ?? 0, reports: reports ?? 0 };

  return (
    <div className="space-y-5">
      <PageHeading title="Q&A & reports" description="Answer product questions and moderate customer content." />
      <nav aria-label="Moderation sections" className="flex flex-wrap gap-1 rounded-md border border-line-soft bg-card p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "unanswered" ? "/admin/questions" : `/admin/questions?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn("inline-flex h-8 items-center gap-2 rounded-sm px-3 text-xs font-medium text-ink-soft hover:bg-surface", tab === t.id && "bg-ink text-white hover:bg-ink")}
          >
            {t.label}
            {counts[t.id] ? <span className={cn("rounded-full px-1.5 text-[10px]", tab === t.id ? "bg-white/20" : "bg-accent text-white")}>{counts[t.id]}</span> : null}
          </Link>
        ))}
      </nav>
      <Suspense key={`${tab}-${page}`} fallback={<TableSkeleton rows={4} />}>
        {tab === "reviews" ? (
          <ReviewsTab page={page} settings={settings} />
        ) : tab === "reports" ? (
          <ReportsTab settings={settings} />
        ) : (
          <QuestionsTab tab={tab} page={page} settings={settings} />
        )}
      </Suspense>
    </div>
  );
}

export default function QuestionsPage(props: PageProps<"/admin/questions">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Questions searchParams={props.searchParams} />
    </Suspense>
  );
}
