"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/errors";

type Props = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => Promise<ActionResult<unknown>>;
  /** Navigate here after success (otherwise the page refreshes). */
  redirectTo?: string;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  destructive?: boolean;
};

/** Button that opens a confirmation dialog before running a server action. */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirm",
  action,
  redirectTo,
  children,
  variant = "outline",
  size = "sm",
  destructive = true,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? "Done.");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} type="button">
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button variant={destructive ? "danger" : "primary"} onClick={run} loading={pending} type="button">
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Run a server action from a click with toast feedback. */
export function useActionRunner() {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  const run = React.useCallback(
    (action: () => Promise<ActionResult<unknown>>, onSuccess?: () => void) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          toast.success(result.message ?? "Saved.");
          onSuccess?.();
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    },
    [router],
  );
  return { pending, run };
}
