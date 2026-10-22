"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { ConfirmButton, useActionRunner } from "@/components/admin/confirm-button";
import {
  answerQuestionAction,
  deleteAnswerAction,
  deleteQuestionAction,
  editQuestionAction,
  moderateQuestionAction,
  moderateReviewAction,
  resolveReportAction,
  updateAnswerAction,
} from "@/actions/admin/questions";

export function AnswerForm({ questionId }: { questionId: string }) {
  const [text, setText] = React.useState("");
  const { pending, run } = useActionRunner();
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) run(() => answerQuestionAction(questionId, text), () => setText(""));
      }}
    >
      <label htmlFor={`answer-${questionId}`} className="sr-only">Answer</label>
      <Textarea id={`answer-${questionId}`} className="min-h-20" placeholder="Write a public answer…" value={text} maxLength={3000} onChange={(e) => setText(e.target.value)} />
      <div className="flex justify-end">
        <Button size="sm" type="submit" loading={pending} disabled={!text.trim()}>Publish answer</Button>
      </div>
    </form>
  );
}

export function EditableText({
  id,
  initial,
  kind,
}: {
  id: string;
  initial: string;
  kind: "answer" | "question";
}) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(initial);
  const { pending, run } = useActionRunner();
  if (!editing) {
    return (
      <div className="group">
        <p className="whitespace-pre-wrap text-sm">{initial}</p>
        <button type="button" className="mt-1 text-xs text-muted hover:text-ink" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    );
  }
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => (kind === "answer" ? updateAnswerAction(id, text) : editQuestionAction(id, text)), () => setEditing(false));
      }}
    >
      <Textarea aria-label={`Edit ${kind}`} className="min-h-16" value={text} onChange={(e) => setText(e.target.value)} maxLength={kind === "answer" ? 3000 : 1000} />
      <div className="flex gap-2">
        <Button size="sm" type="submit" loading={pending}>Save</Button>
        <Button size="sm" type="button" variant="ghost" onClick={() => { setText(initial); setEditing(false); }}>Cancel</Button>
      </div>
    </form>
  );
}

export function QuestionModeration({ questionId, status }: { questionId: string; status: string }) {
  const { pending, run } = useActionRunner();
  const btn = (label: string, next: "pending" | "answered" | "hidden" | "spam") => (
    <Button key={next} size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderateQuestionAction(questionId, next))}>
      {label}
    </Button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "answered" ? btn("Mark answered", "answered") : null}
      {status !== "pending" ? btn("Move to unanswered", "pending") : null}
      {status !== "hidden" ? btn("Hide", "hidden") : null}
      {status !== "spam" ? btn("Spam", "spam") : null}
      <ConfirmButton title="Delete question?" description="The question, its answers and follow-ups are permanently removed." confirmLabel="Delete" action={() => deleteQuestionAction(questionId)}>
        Delete
      </ConfirmButton>
    </div>
  );
}

export function DeleteAnswerButton({ answerId }: { answerId: string }) {
  return (
    <ConfirmButton title="Delete answer?" description="If it is the only answer, the question returns to the unanswered queue." confirmLabel="Delete" action={() => deleteAnswerAction(answerId)} variant="ghost">
      Delete
    </ConfirmButton>
  );
}

export function ReviewModeration({ reviewId, status }: { reviewId: string; status: string }) {
  const { pending, run } = useActionRunner();
  return status === "hidden" ? (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderateReviewAction(reviewId, "published"))}>Publish</Button>
  ) : (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderateReviewAction(reviewId, "hidden"))}>Hide</Button>
  );
}

export function ReportResolution({ reportId }: { reportId: string }) {
  const { pending, run } = useActionRunner();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "resolved"))}>Resolve</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "dismissed"))}>Dismiss</Button>
    </div>
  );
}
