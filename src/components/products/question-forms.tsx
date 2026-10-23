"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { askQuestionAction } from "@/actions/questions";
import { reportContentAction } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { FormError, Input, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function AskQuestionForm({ productId, parentId, compact }: { productId: string; parentId?: string; compact?: boolean }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!compact);
  const [pending, startTransition] = useTransition();
  const id = parentId ? `followup-${parentId}` : "ask-question";

  if (!open) {
    return (
      <button type="button" className="text-xs font-medium text-ink underline-offset-4 hover:underline" onClick={() => setOpen(true)}>
        Ask a follow-up
      </button>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await askQuestionAction({ productId, body, parentId });
          if (result.ok) {
            setBody("");
            setError(null);
            toast.success(result.message ?? "Question sent.");
            if (compact) setOpen(false);
          } else setError(result.error);
        });
      }}
    >
      <label htmlFor={id} className={compact ? "sr-only" : "text-sm font-medium"}>
        {parentId ? "Follow-up question" : "Ask a question about this product"}
      </label>
      <Textarea
        id={id}
        value={body}
        minLength={5}
        maxLength={1000}
        required
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? "Ask a follow-up…" : "e.g. Does it work with macOS?"}
        className={compact ? "min-h-16" : undefined}
      />
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="dark" loading={pending}>
          {parentId ? "Send follow-up" : "Ask question"}
        </Button>
        {compact ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function ReportButton({ targetType, targetId }: { targetType: "question" | "review"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="tap inline-flex items-center gap-1 text-xs text-subtle hover:text-ink">
        <Flag className="size-3" aria-hidden /> Report
      </DialogTrigger>
      <DialogContent title={`Report this ${targetType}`} description="Tell us what is wrong. Reports are reviewed by our team.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await reportContentAction({ targetType, targetId, reason });
              if (result.ok) {
                toast.success(result.message ?? "Reported.");
                setOpen(false);
                setReason("");
              } else setError(result.error);
            });
          }}
        >
          <label htmlFor={`report-${targetId}`} className="sr-only">
            Reason
          </label>
          <Input id={`report-${targetId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Spam, offensive, off-topic…" required />
          <FormError message={error} />
          <Button type="submit" variant="dark" loading={pending}>
            Send report
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
