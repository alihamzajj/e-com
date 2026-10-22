import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[640px] border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("border-b border-line-soft text-left text-xs text-muted", className)} {...props} />;
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return <th scope="col" className={cn("px-4 py-3 font-medium whitespace-nowrap", className)} {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line-soft last:border-0 hover:bg-surface/60", className)} {...props} />;
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
