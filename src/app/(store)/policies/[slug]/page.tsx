import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStoreSettings } from "@/features/settings/queries";
import { Card } from "@/components/ui/primitives";

const TITLES: Record<string, string> = {
  shipping: "Shipping policy",
  returns: "Returns & refunds",
  privacy: "Privacy policy",
  terms: "Terms of service",
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: TITLES[slug] ?? "Policy" };
}

export default function PolicyPage(props: PageProps<"/policies/[slug]">) {
  return (
    <div className="container-page max-w-3xl pt-8 md:pt-12">
      <Suspense fallback={<div className="skeleton h-96 rounded-lg" aria-busy />}>
        <Policy params={props.params} />
      </Suspense>
    </div>
  );
}

async function Policy({ params }: { params: PageProps<"/policies/[slug]">["params"] }) {
  const { slug } = await params;
  const title = TITLES[slug];
  if (!title) notFound();
  const settings = await getStoreSettings();
  const body = settings.policies[slug];
  return (
    <>
      <h1 className="display mb-8 text-[clamp(2.5rem,6vw,4.5rem)]">{title}</h1>
      <Card className="p-6 md:p-10">
        {body ? (
          <div className="space-y-4 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">{body}</div>
        ) : (
          <p className="text-sm text-muted">This policy has not been published yet. Please contact us with any questions.</p>
        )}
      </Card>
    </>
  );
}
