import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-strong",
        dark: "bg-ink text-white hover:bg-ink-soft",
        outline: "border border-line bg-card text-ink hover:border-ink/40",
        ghost: "text-ink hover:bg-ink/5",
        subtle: "bg-surface text-ink hover:bg-line-soft",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "text-ink underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-xs",
        md: "h-10 rounded-sm px-4 text-sm",
        lg: "h-12 rounded-md px-6 text-[15px]",
        icon: "size-10 rounded-sm",
        "icon-sm": "size-8 rounded-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}
